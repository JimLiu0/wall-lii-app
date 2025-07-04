import { supabase } from "@/utils/supabaseClient";
import Image from "next/image";
import { notFound } from "next/navigation";
import Link from "next/link";
import type { Metadata } from "next";
import { JSDOM } from "jsdom";

export const revalidate = 3600; // Revalidate every hour

interface NewsPost {
  id: string;
  title: string;
  slug: string;
  content: string;
  summary?: string;
  image_url?: string;
  author: string;
  created_at: string;
  updated_at?: string;
  type?: string;
  source?: string;
}

function enhancePlaceholdersWithLinks(html: string): string {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  doc.querySelectorAll(".card-grid-placeholder").forEach((placeholder) => {
    const text = placeholder.textContent?.trim();
    if (!text) return;

    const link = doc.createElement("a");
    const query = encodeURIComponent(text);
    link.href = `https://hearthstone.wiki.gg/wiki/Special:Search?search=${query}&fulltext=1&ns0=1`;
    link.textContent = text;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.className = "text-blue-400 hover:text-blue-500 underline";

    placeholder.textContent = ""; // clear existing text
    placeholder.appendChild(link);
  });

  return doc.body.innerHTML;
}

function normalizeEntityName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "").replace(/[^a-zA-Z0-9()]/gi, "");
}

function injectEntityImages(html: string, entityToImageMap: Map<string, string>): string {
  const dom = new JSDOM(html);
  const doc = dom.window.document;

  // First handle card-grid-placeholders
  const placeholders = Array.from(doc.querySelectorAll(".card-grid-placeholder")) as HTMLElement[];
  for (const placeholder of placeholders) {
    const entityName = placeholder.textContent?.trim();
    if (!entityName) continue;

    const imgSrc = entityToImageMap.get(normalizeEntityName(entityName));
    if (!imgSrc) continue;

    // Replace the placeholder with an img element
    const img = doc.createElement("img");
    img.src = imgSrc;
    img.alt = entityName;
    img.loading = "lazy";
    img.decoding = "async";
    img.className = "w-64 h-auto object-contain rounded";
    placeholder.replaceWith(img);
  }

  // Then handle h3 elements as before
  const h3s = Array.from(doc.querySelectorAll("h3")) as HTMLHeadingElement[];

  for (const h3 of h3s) {
    const entityName = h3.textContent?.trim();
    if (!entityName) continue;
    
    const imgSrc = entityToImageMap.get(normalizeEntityName(entityName));
    if (!imgSrc) continue;

    let foundImage = false;
    let node = h3.nextElementSibling;
    let insertAfter: HTMLElement = h3;

    while (node && ["UL", "P"].includes(node.tagName)) {
      if (
        node.tagName === "P" &&
        node.querySelector(`img[alt="${entityName}"]`)
      ) {
        foundImage = true;
        break;
      }
      insertAfter = node as HTMLElement;
      node = node.nextElementSibling;
    }

    if (foundImage) continue;

    // Create new <p><img /></p>
    const newImgPara = doc.createElement("p");
    const img = doc.createElement("img");
    img.src = imgSrc;
    img.alt = entityName;
    img.loading = "lazy";
    img.decoding = "async";
    newImgPara.appendChild(img);

    insertAfter.insertAdjacentElement("afterend", newImgPara);
  }

  // Finally, inject images after <li> items with <strong> entity references
  const allLis = Array.from(doc.querySelectorAll("li")) as HTMLElement[];
  for (const li of allLis) {
    const text = li.textContent || "";
    const foundEntities: string[] = [];

    // Find all entity matches in order of appearance, deduplicated
    for (const [entity] of entityToImageMap.entries()) {
      const regex = new RegExp(`\\b${escapeRegExp(entity)}\\b`, "i");
      if (regex.test(text) && !foundEntities.includes(entity)) {
        console.log(entity);
        foundEntities.push(entity);
      }
    }

    if (foundEntities.length === 0) continue;

    // Remove any existing images for these entities
    for (const entity of foundEntities) {
      const existing = li.querySelector(`img[alt="${entity}"]`);
      if (existing) existing.remove();
    }

    // Append images in order
    for (const entity of foundEntities) {
      const imgSrc = entityToImageMap.get(entity);
      if (!imgSrc) continue;
      const img = doc.createElement("img");
      img.src = imgSrc;
      img.alt = entity;
      img.loading = "lazy";
      img.decoding = "async";
      img.className = "ml-2 block";
      li.appendChild(img);
      console.log(entity);
    }

  }

  return doc.body.innerHTML;
}

// Helper to escape regex special characters in entity names
function escapeRegExp(string: string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

async function getNewsPost(slug: string): Promise<NewsPost | null> {
  const { data, error } = await supabase
    .from("news_posts")
    .select("*")
    .eq("slug", slug)
    .eq("is_published", true)
    .single();

  if (error || !data) {
    console.error("Error fetching news post:", error);
    return null;
  }

  return data;
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const resolvedParams = await params;
  const post = await getNewsPost(resolvedParams.slug);

  if (!post) {
    return {
      title: "Post Not Found",
    };
  }

  return {
    title: post.title,
    description: post.summary,
  };
}

export default async function NewsPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const resolvedParams = await params;
  const post = await getNewsPost(resolvedParams.slug);

  if (!post) {
    notFound();
  }

  // Fetch all bg_entities in chunks
  async function fetchAllEntities(): Promise<
    { entity_name: string; image_url: string }[]
  > {
    const chunkSize = 1000;
    const allEntities: { entity_name: string; image_url: string }[] = [];
    let from = 0;
    let to = chunkSize - 1;

    while (true) {
      const { data, error } = await supabase
        .from("bg_entities")
        .select("entity_name, image_url")
        .range(from, to);

      if (error) {
        console.error("Error fetching bg_entities:", error);
        break;
      }

      if (!data || data.length === 0) {
        break;
      }

      allEntities.push(...data);

      if (data.length < chunkSize) {
        break; // final chunk
      }

      from += chunkSize;
      to += chunkSize;
    }

    return allEntities;
  }

  const entities = await fetchAllEntities();

  const entityMap = new Map<string, string>();
  for (const e of entities) {
    const baseName = e.entity_name.trim();
    const normalized = normalizeEntityName(baseName);
    entityMap.set(normalized, e.image_url);

    const isLesser = baseName.toLowerCase().includes("(lesser)");
    const stripped = baseName.replace(/\s*\(.*?\)/g, "").trim();
    const normalizedStripped = normalizeEntityName(stripped);

    // Only set stripped -> lesser mapping if it's not already set or if this one is (lesser)
    if (isLesser || !entityMap.has(normalizedStripped)) {
      entityMap.set(normalizedStripped, e.image_url);
    }
  }

  // Process the content to inject entity images
  const processedContent = injectEntityImages(post.content, entityMap);

  // Add placeholder links
  const processedContentWithLinks = enhancePlaceholdersWithLinks(processedContent);

  return (
    <div className="min-h-screen bg-gray-950">
      <div className="container mx-auto px-4 py-8">
        {/* Back button */}
        <Link
          href="/news"
          className="inline-flex items-center text-blue-400 hover:text-blue-300 mb-8 transition-colors"
        >
          <svg
            className="w-5 h-5 mr-2"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to News
        </Link>

        <article className="max-w-4xl mx-auto bg-gray-900 rounded-xl overflow-hidden shadow-xl">
          {/* Hero Image */}
          {post.image_url && (
            <div className="relative w-full h-[400px]">
              <Image
                src={post.image_url}
                alt={post.title}
                fill
                className="object-cover"
                priority
              />
            </div>
          )}

          <div className="p-8">
            {/* Metadata */}
            <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-6">
              <span className="bg-gray-800 px-3 py-1 rounded-full">
                {new Date(post.created_at).toLocaleDateString("en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
              <span className="bg-gray-800 px-3 py-1 rounded-full">
                By {post.author}
              </span>
              {post.type && (
                <span className="bg-blue-900 text-blue-200 px-3 py-1 rounded-full">
                  {post.type}
                </span>
              )}
            </div>

            {/* Title */}
            <h1 className="text-4xl font-bold text-white mb-6 leading-tight">
              {post.title}
            </h1>

            {/* Summary */}
            {post.summary && (
              <div className="text-xl text-gray-300 mb-8 font-medium leading-relaxed">
                {post.summary}
              </div>
            )}

            {/* Source */}
            <div className="text-xl text-gray-300 mb-8 font-medium leading-relaxed">
              <a
                className="text-blue-400 hover:text-blue-300"
                href={post.source}
                target="_blank"
                rel="noopener noreferrer"
              >
                Original Source
              </a>
            </div>

            {/* Content */}
            <div 
              className="prose prose-lg prose-invert max-w-none flex-image
              [&>p]:block
              sm:[&>p:has(img)]:grid
              sm:[&>p:has(img)]:grid-cols-2
              [&>p>img]:w-48
              [&>p>img]:sm:w-64
              [&>p>img]:mx-auto
              [&>p>img]:h-auto
              [&>.card-grid]:grid
              [&>.card-grid]:gap-6
              [&>.card-grid]:grid-cols-1
              sm:[&>.card-grid]:grid-cols-2
              md:[&>.card-grid]:grid-cols-3
              [&_.card-grid-placeholder]:bg-gray-800
              [&_.card-grid-placeholder]:text-white
              [&_.card-grid-placeholder]:rounded
              [&_.card-grid-placeholder]:p-4
              [&_.card-grid-placeholder]:text-center
              [&_.card-grid-placeholder]:font-semibold
              [&_.card-grid-placeholder]:text-lg
              [&_.card-grid-placeholder]:border
              [&_.card-grid-placeholder]:border-gray-700
              [&_.card-grid-placeholder]:shadow
              [&_.card-grid-item:has(.card-grid-placeholder)]:flex
              [&_.card-grid-item:has(.card-grid-placeholder)]:flex-col
              [&_.card-grid-item:has(.card-grid-placeholder)]:items-center
              [&_.card-grid-item:has(.card-grid-placeholder)]:justify-center" 
              dangerouslySetInnerHTML={{ __html: processedContentWithLinks }}
            />
            
            {/* Footer metadata */}
            <div className="mt-12 pt-6 border-t border-gray-800 text-sm text-gray-400">
              Last updated:{" "}
              {new Date(post.updated_at || post.created_at).toLocaleDateString(
                "en-US",
                {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                },
              )}
            </div>
          </div>
        </article>
      </div>
    </div>
  );
}
