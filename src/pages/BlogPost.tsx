import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { Calendar, Clock, ArrowLeft, Share2, Tag, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BlogSEO from "@/components/BlogSEO";

// Blog post interface
interface BlogPost {
  id: string;
  title: string;
  excerpt: string;
  content: string;
  author: string;
  publishedAt: string;
  readTime: string;
  category: string;
  tags: string[];
  slug: string;
  featured: boolean;
}

// Sample blog posts (same as in Blog.tsx)
const sampleBlogPosts: BlogPost[] = [
  {
    id: "1",
    title: "How to Write a Compelling Personal Statement That Stands Out",
    excerpt: "Learn the secrets to crafting a personal statement that admissions officers will remember. Discover proven strategies for storytelling, structure, and authenticity.",
    content: `
      <h2>Introduction</h2>
      <p>Your personal statement is one of the most important components of your college application. It's your chance to tell your story, showcase your personality, and demonstrate why you're a perfect fit for the institution you're applying to. But with thousands of applications to review, admissions officers need something that truly stands out.</p>
      
      <h2>Understanding What Makes a Personal Statement Compelling</h2>
      <p>A compelling personal statement goes beyond simply listing your achievements. It tells a story that reveals your character, values, and growth. Here are the key elements that make a personal statement memorable:</p>
      
      <h3>1. Authentic Voice</h3>
      <p>Your personal statement should sound like you. Avoid overly formal language or trying to impress with complex vocabulary. Write in your natural voice, as if you're having a conversation with the admissions officer.</p>
      
      <h3>2. Specific Examples</h3>
      <p>Instead of making broad statements about your character, use specific examples that demonstrate your qualities. Show, don't tell. For instance, rather than saying "I'm a leader," describe a specific situation where you took initiative and led others to success.</p>
      
      <h3>3. Personal Growth</h3>
      <p>Admissions officers want to see how you've grown and learned from your experiences. Reflect on challenges you've faced and how they've shaped you into the person you are today.</p>
      
      <h2>Structure and Organization</h2>
      <p>A well-structured personal statement follows a clear narrative arc:</p>
      
      <h3>Opening Hook</h3>
      <p>Start with something that immediately captures attention. This could be a surprising fact, a vivid scene, or a thought-provoking question. Avoid clichés like "Ever since I was a child..."</p>
      
      <h3>Body Paragraphs</h3>
      <p>Develop your main points with specific examples and reflections. Each paragraph should focus on one key aspect of your story or character.</p>
      
      <h3>Conclusion</h3>
      <p>Tie everything together and look forward to the future. How do your experiences prepare you for college and beyond?</p>
      
      <h2>Common Mistakes to Avoid</h2>
      <ul>
        <li><strong>Being too generic:</strong> Avoid topics that many students write about unless you have a unique angle</li>
        <li><strong>Listing achievements:</strong> Your resume already covers your accomplishments</li>
        <li><strong>Writing about others:</strong> Focus on yourself and your experiences</li>
        <li><strong>Being negative:</strong> Even when discussing challenges, focus on growth and learning</li>
        <li><strong>Exceeding word limits:</strong> Respect the guidelines provided</li>
      </ul>
      
      <h2>Tips for Getting Started</h2>
      <p>If you're struggling to begin, try these brainstorming techniques:</p>
      
      <h3>Free Writing</h3>
      <p>Set a timer for 10 minutes and write continuously about yourself without stopping. Don't worry about grammar or structure - just get your thoughts on paper.</p>
      
      <h3>Reflect on Significant Moments</h3>
      <p>Think about moments in your life that have shaped who you are. These could be challenges overcome, lessons learned, or experiences that changed your perspective.</p>
      
      <h3>Ask Others</h3>
      <p>Sometimes others see qualities in us that we don't recognize ourselves. Ask family, friends, or teachers what they think makes you unique.</p>
      
      <h2>Revision and Editing</h2>
      <p>Your first draft is just the beginning. Effective revision involves:</p>
      
      <ul>
        <li>Reading your essay aloud to check for flow and clarity</li>
        <li>Getting feedback from trusted mentors or teachers</li>
        <li>Checking for grammar and spelling errors</li>
        <li>Ensuring every sentence serves a purpose</li>
        <li>Verifying that your voice comes through clearly</li>
      </ul>
      
      <h2>Conclusion</h2>
      <p>Writing a compelling personal statement takes time, reflection, and revision. Start early, be authentic, and don't be afraid to share your unique story. Remember, admissions officers are looking for students who will contribute to their campus community - let your personality and values shine through.</p>
      
      <p>If you need additional guidance in crafting your personal statement, consider using AI-powered tools like Diya AI to help you brainstorm ideas, structure your thoughts, and refine your writing while maintaining your authentic voice.</p>
    `,
    author: "Diya AI Team",
    publishedAt: "2024-01-15",
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
    content: "Full content here...",
    author: "Diya AI Team",
    publishedAt: "2024-01-10",
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
    content: "Full content here...",
    author: "Diya AI Team",
    publishedAt: "2024-01-08",
    readTime: "12 min read",
    category: "MBA Applications",
    tags: ["MBA", "business school", "essay writing", "graduate school"],
    slug: "ultimate-guide-mba-application-essays",
    featured: true
  },
  {
    id: "4",
    title: "Building a Strong Resume for College Applications",
    excerpt: "Your resume is more than just a list of activities. Learn how to showcase your achievements and experiences effectively for college admissions.",
    content: "Full content here...",
    author: "Diya AI Team",
    publishedAt: "2024-01-05",
    readTime: "7 min read",
    category: "Resume Building",
    tags: ["resume", "activities", "achievements", "college prep"],
    slug: "building-strong-resume-college-applications",
    featured: false
  },
  {
    id: "5",
    title: "Understanding College Admissions Deadlines: A Complete Timeline",
    excerpt: "Navigate the complex world of college application deadlines with our comprehensive timeline guide. Never miss an important date again.",
    content: "Full content here...",
    author: "Diya AI Team",
    publishedAt: "2024-01-03",
    readTime: "9 min read",
    category: "Application Process",
    tags: ["deadlines", "timeline", "planning", "college prep"],
    slug: "understanding-college-admissions-deadlines",
    featured: false
  },
  {
    id: "6",
    title: "How AI is Transforming College Essay Writing",
    excerpt: "Discover how artificial intelligence is revolutionizing the way students approach essay writing while maintaining authenticity and personal voice.",
    content: "Full content here...",
    author: "Diya AI Team",
    publishedAt: "2024-01-01",
    readTime: "10 min read",
    category: "Technology",
    tags: ["AI", "technology", "essay writing", "innovation"],
    slug: "how-ai-transforming-college-essay-writing",
    featured: true
  }
];

const BlogPost = () => {
  const { slug } = useParams<{ slug: string }>();
  const [post, setPost] = useState<BlogPost | null>(null);
  const [relatedPosts, setRelatedPosts] = useState<BlogPost[]>([]);

  useEffect(() => {
    if (slug) {
      const foundPost = sampleBlogPosts.find(p => p.slug === slug);
      setPost(foundPost || null);
      
      if (foundPost) {
        // Find related posts (same category or shared tags)
        const related = sampleBlogPosts
          .filter(p => p.id !== foundPost.id && (
            p.category === foundPost.category || 
            p.tags.some(tag => foundPost.tags.includes(tag))
          ))
          .slice(0, 3);
        setRelatedPosts(related);
      }
    }
  }, [slug]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const handleShare = async () => {
    if (navigator.share && post) {
      try {
        await navigator.share({
          title: post.title,
          text: post.excerpt,
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

  if (!post) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Post Not Found</h1>
          <p className="text-gray-600 mb-8">The blog post you're looking for doesn't exist.</p>
          <Link to="/blog">
            <Button>Back to Blog</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <BlogSEO post={post} />
      
      {/* Header */}
      <div className="bg-white border-b">
        <div className="container mx-auto px-6 py-8">
          <div className="max-w-4xl mx-auto">
            <Link to="/blog" className="inline-flex items-center text-primary hover:text-primary/80 mb-6">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Blog
            </Link>
            
            <div className="flex items-center gap-2 mb-4">
              <Badge variant="secondary">{post.category}</Badge>
              {post.featured && (
                <Badge variant="default" className="bg-primary">Featured</Badge>
              )}
            </div>
            
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 leading-tight">
              {post.title}
            </h1>
            
            <p className="text-xl text-gray-600 mb-8 leading-relaxed">
              {post.excerpt}
            </p>
            
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-6 text-sm text-gray-500">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  {post.author}
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  {formatDate(post.publishedAt)}
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  {post.readTime}
                </div>
              </div>
              
              <Button variant="outline" size="sm" onClick={handleShare}>
                <Share2 className="h-4 w-4 mr-2" />
                Share
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-6 py-12">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-4 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-3">
              <article className="bg-white rounded-lg shadow-sm p-8 prose prose-lg max-w-none">
                <div dangerouslySetInnerHTML={{ __html: post.content }} />
              </article>
              
              {/* Tags */}
              <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Tags</h3>
                <div className="flex flex-wrap gap-2">
                  {post.tags.map(tag => (
                    <Badge key={tag} variant="outline" className="flex items-center gap-1">
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
            
            {/* Sidebar */}
            <div className="lg:col-span-1">
              {/* Author Info */}
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle className="text-lg">About the Author</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-600 to-orange-500 flex items-center justify-center">
                      <span className="text-white font-semibold">DA</span>
                    </div>
                    <div>
                      <h4 className="font-semibold">{post.author}</h4>
                      <p className="text-sm text-gray-600">College Admissions Expert</p>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Our team of admissions experts and AI specialists work together to provide 
                    comprehensive guidance for your college application journey.
                  </p>
                </CardContent>
              </Card>
              
              {/* Related Posts */}
              {relatedPosts.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Related Articles</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {relatedPosts.map(relatedPost => (
                      <Link 
                        key={relatedPost.id} 
                        to={`/blog/${relatedPost.slug}`}
                        className="block group"
                      >
                        <div className="border-l-2 border-transparent group-hover:border-primary pl-4 transition-colors">
                          <h4 className="font-semibold text-sm group-hover:text-primary transition-colors line-clamp-2 mb-1">
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
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* CTA Section */}
      <div className="bg-primary text-white py-16">
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4">Ready to Improve Your Essays?</h2>
          <p className="text-xl mb-8 opacity-90">
            Get personalized AI-powered assistance for your college application essays
          </p>
          <Link to="/auth">
            <Button size="lg" variant="secondary" className="hover:shadow-lg transition-all">
              Start Writing Better Essays
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default BlogPost;
