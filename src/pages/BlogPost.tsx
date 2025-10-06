import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, Clock, ArrowLeft, Share2, Tag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BlogSEO from "@/components/BlogSEO";
import { loadBlogPost, loadAllBlogPosts, BlogPostMetadata, BlogPostFile } from "@/services/blogService";

// Function to extract article content from HTML
function extractArticleContent(htmlContent: string): string {
  // Extract content from <article> tag or <body> tag
  const articleMatch = htmlContent.match(/<article[^>]*>([\s\S]*?)<\/article>/i);
  if (articleMatch) {
    return articleMatch[1];
  }
  
  // Fallback: extract from body tag
  const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  if (bodyMatch) {
    return bodyMatch[1];
  }
  
  // If no article or body tags found, return the full content
  return htmlContent;
}

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [postFile, setPostFile] = useState<BlogPostFile | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPostMetadata[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadPost = async () => {
      if (!slug) return;
      
      try {
        setLoading(true);
        const post = await loadBlogPost(slug);
        setPostFile(post);
        
        if (post) {
          // Load related posts
          const allPosts = await loadAllBlogPosts();
          const related = allPosts
            .filter(p => p.slug !== slug && (
              p.category === post.metadata.category || 
              p.tags.some(tag => post.metadata.tags.includes(tag))
            ))
            .slice(0, 3);
          setRelatedPosts(related);
        }
      } catch (error) {
        console.error('Error loading blog post:', error);
        setPostFile(null);
      } finally {
        setLoading(false);
      }
    };

    loadPost();
  }, [slug]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = async () => {
    if (navigator.share && postFile) {
      try {
        await navigator.share({
          title: postFile.metadata.title,
          text: postFile.metadata.excerpt,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(window.location.href);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 text-sm sm:text-base">Loading blog post...</p>
        </div>
      </div>
    );
  }

  if (!postFile) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="text-center">
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-6 sm:mb-8 text-sm sm:text-base">The blog post you're looking for doesn't exist.</p>
          <Link to="/blog">
            <Button className="w-full sm:w-auto">Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  const post = postFile.metadata;

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4EDE2' }}>
      <BlogSEO post={post as BlogPostMetadata} />
      
      {/* Header */}
      <div className="border-b" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="container mx-auto px-4 sm:px-6 py-6 sm:py-8">
          <div className="max-w-6xl mx-auto">
            <Link to="/blog" className="inline-flex items-center text-primary hover:text-primary/80 mb-4 sm:mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Link>
            
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <Badge variant="secondary">{post.category}</Badge>
              {post.featured && (
                <Badge variant="default" className="bg-primary">Featured</Badge>
              )}
            </div>
            
            <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
              {post.title}
            </h1>
            
            <p className="text-lg sm:text-xl text-gray-600 mb-6 sm:mb-8 leading-relaxed">
              {post.excerpt}
            </p>
            
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <User className="h-3 w-3 sm:h-4 sm:w-4" />
                  {post.author}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3 w-3 sm:h-4 sm:w-4" />
                  {formatDate(post.publishedAt)}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3 sm:h-4 sm:w-4" />
                  {post.readTime}
                </div>
              </div>
              
              <Button variant="outline" size="sm" onClick={handleShare} className="w-full sm:w-auto">
                <Share2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 sm:px-6 py-8 sm:py-12">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-5 gap-6 lg:gap-12">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <article className="rounded-lg p-4 sm:p-6 lg:p-8 prose prose-sm sm:prose-base lg:prose-lg max-w-none">
                <div dangerouslySetInnerHTML={{ __html: extractArticleContent(postFile.content) }} />
              </article>
              
              {/* Tags */}
              <div className="mt-6 sm:mt-8">
                <h3 className="text-base sm:text-lg font-semibold text-gray-900 mb-3 sm:mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="flex items-center gap-1 bg-white border-gray-300 text-gray-700 hover:bg-gray-50 text-xs sm:text-sm">
                      {tag.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-2">
              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <div className="rounded-lg border p-4 sm:p-6 bg-white shadow-sm">
                  <div className="mb-4">
                    <h3 className="text-base sm:text-lg font-semibold">Related Articles</h3>
                  </div>
                  <div className="space-y-4">
                    {relatedPosts.map(relatedPost => (
                      <Link 
                        key={relatedPost.id} 
                        to={`/blog/${relatedPost.slug}`}
                        className="block group"
                      >
                        <div className="border-l-2 border-transparent group-hover:border-primary pl-3 sm:pl-4 transition-colors">
                          <h4 className="font-semibold text-xs sm:text-sm group-hover:text-primary transition-colors line-clamp-2 mb-1">
                            {relatedPost.title}
                          </h4>
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {relatedPost.excerpt}
                          </p>
                          <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
                            <Calendar className="h-3 w-3" />
                            {formatDate(relatedPost.publishedAt)}
                            <Clock className="h-3 w-3 ml-2" />
                            {relatedPost.readTime}
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-12 sm:py-16" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="container mx-auto px-4 sm:px-6 text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 text-gray-900">Ready to Improve Your Essays?</h2>
          <p className="text-lg sm:text-xl mb-6 sm:mb-8 text-gray-600 px-4">
            Get personalized AI-powered assistance for your college application essays
          </p>
          <Link to="/auth">
            <Button size="lg" className="hover:shadow-lg transition-all w-full sm:w-auto" style={{ backgroundColor: '#D07D00', color: 'white' }}>
              Start Writing Better Essays
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogPost;
