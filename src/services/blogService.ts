// Blog service to load and manage blog posts from HTML files
export interface BlogPostMetadata {
  id: string;
  title: string;
  excerpt: string;
  author: string;
  publishedAt: string;
  readTime: string;
  category: string;
  tags: string[];
  slug: string;
  featured: boolean;
  content?: string;
}

export interface BlogPostFile {
  metadata: BlogPostMetadata;
  content: string;
}

// Function to extract metadata from HTML content
function extractMetadataFromHTML(htmlContent: string): Partial<BlogPostMetadata> {
  const metadata: Partial<BlogPostMetadata> = {};
  
  // Extract title from <title> tag or first <h1>
  const titleMatch = htmlContent.match(/<title[^>]*>([^<]+)<\/title>/i) || 
                     htmlContent.match(/<h1[^>]*>([^<]+)<\/h1>/i);
  if (titleMatch) {
    metadata.title = titleMatch[1].trim();
  }
  
  // Extract excerpt from meta description or first paragraph
  const excerptMatch = htmlContent.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i) ||
                      htmlContent.match(/<p[^>]*>([^<]+)<\/p>/i);
  if (excerptMatch) {
    metadata.excerpt = excerptMatch[1].trim();
  }
  
  // Extract author from meta author or data attribute
  const authorMatch = htmlContent.match(/<meta[^>]*name=["']author["'][^>]*content=["']([^"']+)["']/i) ||
                     htmlContent.match(/data-author=["']([^"']+)["']/i);
  if (authorMatch) {
    metadata.author = authorMatch[1].trim();
  }
  
  // Extract published date from meta date or data attribute
  const dateMatch = htmlContent.match(/<meta[^>]*name=["']date["'][^>]*content=["']([^"']+)["']/i) ||
                   htmlContent.match(/data-published=["']([^"']+)["']/i);
  if (dateMatch) {
    metadata.publishedAt = dateMatch[1].trim();
  }
  
  // Extract read time from meta or data attribute
  const readTimeMatch = htmlContent.match(/<meta[^>]*name=["']read-time["'][^>]*content=["']([^"']+)["']/i) ||
                       htmlContent.match(/data-read-time=["']([^"']+)["']/i);
  if (readTimeMatch) {
    metadata.readTime = readTimeMatch[1].trim();
  }
  
  // Extract category from meta or data attribute
  const categoryMatch = htmlContent.match(/<meta[^>]*name=["']category["'][^>]*content=["']([^"']+)["']/i) ||
                       htmlContent.match(/data-category=["']([^"']+)["']/i);
  if (categoryMatch) {
    metadata.category = categoryMatch[1].trim();
  }
  
  // Extract tags from meta or data attribute
  const tagsMatch = htmlContent.match(/<meta[^>]*name=["']tags["'][^>]*content=["']([^"']+)["']/i) ||
                   htmlContent.match(/data-tags=["']([^"']+)["']/i);
  if (tagsMatch) {
    metadata.tags = tagsMatch[1].split(',').map(tag => tag.trim());
  }
  
  // Extract featured status from meta or data attribute
  const featuredMatch = htmlContent.match(/<meta[^>]*name=["']featured["'][^>]*content=["']([^"']+)["']/i) ||
                       htmlContent.match(/data-featured=["']([^"']+)["']/i);
  if (featuredMatch) {
    metadata.featured = featuredMatch[1].toLowerCase() === 'true';
  }
  
  return metadata;
}

// Function to load a single blog post file
export async function loadBlogPost(slug: string): Promise<BlogPostFile | null> {
  try {
    // Import the HTML file dynamically
    const response = await fetch(`/blog-posts/${slug}.html`);
    if (!response.ok) {
      return null;
    }
    
    const htmlContent = await response.text();
    
    // Extract metadata from HTML
    const extractedMetadata = extractMetadataFromHTML(htmlContent);
    
    // Generate slug from filename if not provided
    const generatedSlug = slug;
    
    // Create complete metadata with defaults
    const metadata: BlogPostMetadata = {
      id: slug,
      title: extractedMetadata.title || 'Untitled',
      excerpt: extractedMetadata.excerpt || 'No excerpt available',
      author: extractedMetadata.author || 'Diya AI Team',
      publishedAt: extractedMetadata.publishedAt || new Date().toISOString().split('T')[0],
      readTime: extractedMetadata.readTime || '5 min read',
      category: extractedMetadata.category || 'General',
      tags: extractedMetadata.tags || [],
      slug: generatedSlug,
      featured: extractedMetadata.featured || false,
    };
    
    return {
      metadata,
      content: htmlContent
    };
  } catch (error) {
    console.error(`Error loading blog post ${slug}:`, error);
    return null;
  }
}

// Function to load all blog posts
export async function loadAllBlogPosts(): Promise<BlogPostMetadata[]> {
  try {
    // Get list of available blog post files
    const response = await fetch('/blog-posts/index.json');
    if (!response.ok) {
      console.warn('Blog posts index not found, falling back to sample posts');
      return getSampleBlogPosts();
    }
    
    const blogIndex = await response.json();
    const posts: BlogPostMetadata[] = [];
    
    // Load metadata for each post
    for (const slug of blogIndex.posts) {
      const postFile = await loadBlogPost(slug);
      if (postFile) {
        posts.push(postFile.metadata);
      }
    }
    
    // Sort by published date (newest first)
    return posts.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
  } catch (error) {
    console.error('Error loading blog posts:', error);
    return getSampleBlogPosts();
  }
}

// Fallback sample blog posts
function getSampleBlogPosts(): BlogPostMetadata[] {
  return [
    {
      id: "1",
      title: "How to Write a Compelling Personal Statement That Stands Out",
      excerpt: "Learn the secrets to crafting a personal statement that admissions officers will remember. Discover proven strategies for storytelling, structure, and authenticity.",
      author: "Diya AI Team",
      publishedAt: "2024-12-15",
      readTime: "8 min read",
      category: "Essay Writing",
      tags: ["personal statement", "college admissions", "essay tips", "storytelling"],
      slug: "how-to-write-compelling-personal-statement",
      featured: true
    },
    {
      id: "2",
      title: "Common College Essay Mistakes That Kill Your Application",
      excerpt: "Avoid these critical mistakes that can derail your college application. Learn what admissions officers really don't want to see in your essays.",
      author: "Diya AI Team",
      publishedAt: "2024-12-10",
      readTime: "6 min read",
      category: "Essay Writing",
      tags: ["essay mistakes", "college application", "admissions", "tips"],
      slug: "common-college-essay-mistakes",
      featured: false
    },
    {
      id: "3",
      title: "The Ultimate Guide to MBA Application Essays",
      excerpt: "Master the art of MBA essay writing with our comprehensive guide. From brainstorming to final draft, we cover everything you need to know.",
      author: "Diya AI Team",
      publishedAt: "2024-12-05",
      readTime: "12 min read",
      category: "MBA Applications",
      tags: ["MBA", "business school", "essay writing", "graduate school"],
      slug: "ultimate-guide-mba-application-essays",
      featured: true
    }
  ];
}

// Function to generate blog posts index
export function generateBlogIndex(posts: string[]): string {
  return JSON.stringify({ posts }, null, 2);
}
