import { Helmet } from 'react-helmet-async';
import { BlogPostMetadata } from '@/services/blogService';

interface BlogSEOProps {
  post?: BlogPostMetadata;
  isBlogList?: boolean;
}

const BlogSEO = ({ post, isBlogList = false }: BlogSEOProps) => {
  const siteUrl = 'https://diya-ai.com'; // Replace with your actual domain
  const siteName = 'Diya AI';
  const siteDescription = 'AI-powered college application assistance for essays, resumes, and admissions guidance';

  if (isBlogList) {
    return (
      <Helmet>
        <title>College Admissions Blog | Expert Tips & Strategies | Diya AI</title>
        <meta name="description" content="Get expert insights on college admissions, essay writing, resume building, and application strategies. Learn from our comprehensive blog covering undergraduate and graduate school applications." />
        <meta name="keywords" content="college admissions blog, essay writing tips, college application advice, personal statement help, MBA applications, undergraduate admissions, college prep" />
        
        {/* Open Graph / Facebook */}
        <meta property="og:type" content="website" />
        <meta property="og:url" content={`${siteUrl}/blog`} />
        <meta property="og:title" content="College Admissions Blog | Expert Tips & Strategies | Diya AI" />
        <meta property="og:description" content="Get expert insights on college admissions, essay writing, resume building, and application strategies. Learn from our comprehensive blog covering undergraduate and graduate school applications." />
        <meta property="og:image" content={`${siteUrl}/og-blog-image.jpg`} />
        <meta property="og:site_name" content={siteName} />
        
        {/* Twitter */}
        <meta property="twitter:card" content="summary_large_image" />
        <meta property="twitter:url" content={`${siteUrl}/blog`} />
        <meta property="twitter:title" content="College Admissions Blog | Expert Tips & Strategies | Diya AI" />
        <meta property="twitter:description" content="Get expert insights on college admissions, essay writing, resume building, and application strategies. Learn from our comprehensive blog covering undergraduate and graduate school applications." />
        <meta property="twitter:image" content={`${siteUrl}/og-blog-image.jpg`} />
        
        {/* Canonical URL */}
        <link rel="canonical" href={`${siteUrl}/blog`} />
        
        {/* Structured Data for Blog */}
        <script type="application/ld+json">
          {JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Blog",
            "name": "Diya AI College Admissions Blog",
            "description": "Expert insights on college admissions, essay writing, resume building, and application strategies",
            "url": `${siteUrl}/blog`,
            "publisher": {
              "@type": "Organization",
              "name": siteName,
              "url": siteUrl,
              "logo": {
                "@type": "ImageObject",
                "url": `${siteUrl}/DiyaLogo.svg`
              }
            },
            "mainEntityOfPage": {
              "@type": "WebPage",
              "@id": `${siteUrl}/blog`
            }
          })}
        </script>
      </Helmet>
    );
  }

  if (!post) return null;

  const postUrl = `${siteUrl}/blog/${post.slug}`;
  const postImage = `${siteUrl}/blog-images/${post.slug}.jpg`; // You can create specific images for each post

  return (
    <Helmet>
      <title>{post.title} | Diya AI Blog</title>
      <meta name="description" content={post.excerpt} />
      <meta name="keywords" content={post.tags ? post.tags.join(', ') : ''} />
      <meta name="author" content={post.author} />
      
      {/* Open Graph / Facebook */}
      <meta property="og:type" content="article" />
      <meta property="og:url" content={postUrl} />
      <meta property="og:title" content={post.title} />
      <meta property="og:description" content={post.excerpt} />
      <meta property="og:image" content={postImage} />
      <meta property="og:site_name" content={siteName} />
      <meta property="article:published_time" content={post.publishedAt} />
      <meta property="article:author" content={post.author} />
      <meta property="article:section" content={post.category} />
      {post.tags && post.tags.map(tag => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}
      
      {/* Twitter */}
      <meta property="twitter:card" content="summary_large_image" />
      <meta property="twitter:url" content={postUrl} />
      <meta property="twitter:title" content={post.title} />
      <meta property="twitter:description" content={post.excerpt} />
      <meta property="twitter:image" content={postImage} />
      
      {/* Canonical URL */}
      <link rel="canonical" href={postUrl} />
      
      {/* Structured Data for Article */}
      <script type="application/ld+json">
        {JSON.stringify({
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          "headline": post.title,
          "description": post.excerpt,
          "image": postImage,
          "url": postUrl,
          "datePublished": post.publishedAt,
          "dateModified": post.publishedAt,
          "author": {
            "@type": "Organization",
            "name": post.author,
            "url": siteUrl
          },
          "publisher": {
            "@type": "Organization",
            "name": siteName,
            "url": siteUrl,
            "logo": {
              "@type": "ImageObject",
              "url": `${siteUrl}/DiyaLogo.svg`
            }
          },
          "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": postUrl
          },
          "articleSection": post.category,
          "keywords": post.tags ? post.tags.join(', ') : '',
          "wordCount": post.content ? post.content.split(' ').length : 0,
          "timeRequired": post.readTime
        })}
      </script>
    </Helmet>
  );
};

export default BlogSEO;
