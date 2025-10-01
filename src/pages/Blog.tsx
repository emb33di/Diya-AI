import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Calendar, Clock, ArrowRight, Search, Tag } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import BlogSEO from "@/components/BlogSEO";
import { loadAllBlogPosts, BlogPostMetadata } from "@/services/blogService";

const Blog = () => {
  const [posts, setPosts] = useState<BlogPostMetadata[]>([]);
  const [filteredPosts, setFilteredPosts] = useState<BlogPostMetadata[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedTag, setSelectedTag] = useState("");

  // Load blog posts on component mount
  useEffect(() => {
    const loadPosts = async () => {
      try {
        setLoading(true);
        const loadedPosts = await loadAllBlogPosts();
        setPosts(loadedPosts);
        setFilteredPosts(loadedPosts);
      } catch (error) {
        console.error('Error loading blog posts:', error);
        setPosts([]);
        setFilteredPosts([]);
      } finally {
        setLoading(false);
      }
    };

    loadPosts();
  }, []);

  // Get unique categories
  const categories = ["All", ...Array.from(new Set(posts.map(post => post.category)))];
  
  // Get all unique tags
  const allTags = Array.from(new Set(posts.flatMap(post => post.tags)));

  // Filter posts based on search term, category, and tag
  useEffect(() => {
    let filtered = posts;

    if (searchTerm) {
      filtered = filtered.filter(post => 
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.excerpt.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory !== "All") {
      filtered = filtered.filter(post => post.category === selectedCategory);
    }

    if (selectedTag) {
      filtered = filtered.filter(post => post.tags.includes(selectedTag));
    }

    setFilteredPosts(filtered);
  }, [searchTerm, selectedCategory, selectedTag, posts]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const featuredPosts = filteredPosts.filter(post => post.featured);
  const regularPosts = filteredPosts.filter(post => !post.featured);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600">Loading blog posts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#F4EDE2' }}>
      <BlogSEO isBlogList={true} />
      
      {/* SEO-optimized meta tags will be handled by the parent component */}
      
      {/* Header Section */}
      <div className="border-b" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="container mx-auto px-6 py-16">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">
              College Admissions Blog
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Expert insights, tips, and strategies to help you navigate your college application journey
            </p>
            
            {/* Search Bar */}
            <div className="relative max-w-md mx-auto">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <Input
                type="text"
                placeholder="Search articles..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-3 text-lg"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-12">
        <div className="max-w-7xl mx-auto">
          {/* Category Filter */}
          <div className="flex flex-wrap gap-2 mb-8 justify-center">
            {categories.map(category => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory(category)}
                className="mb-2"
              >
                {category}
              </Button>
            ))}
          </div>

          {/* Tag Filter */}
          {selectedCategory === "All" && (
            <div className="flex flex-wrap gap-2 mb-8 justify-center">
              <Button
                variant={selectedTag === "" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTag("")}
                className="mb-2"
              >
                All Tags
              </Button>
              {allTags.map(tag => (
                <Button
                  key={tag}
                  variant={selectedTag === tag ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTag(tag)}
                  className="mb-2"
                >
                  <Tag className="h-3 w-3 mr-1" />
                  {tag}
                </Button>
              ))}
            </div>
          )}

          {/* Featured Posts */}
          {featuredPosts.length > 0 && (
            <div className="mb-16">
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Featured Articles</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {featuredPosts.map(post => (
                  <div key={post.id} className="group hover:shadow-lg transition-all duration-300 border rounded-lg p-6 bg-white">
                    <div className="pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {post.category}
                        </Badge>
                        {post.featured && (
                          <Badge variant="default" className="text-xs bg-primary">
                            Featured
                          </Badge>
                        )}
                      </div>
                      <h3 className="text-xl group-hover:text-primary transition-colors line-clamp-2 font-semibold mb-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 line-clamp-3">
                        {post.excerpt}
                      </p>
                    </div>
                    <div className="pt-0">
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(post.publishedAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {post.readTime}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-4">
                        {post.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {post.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{post.tags.length - 3} more
                          </Badge>
                        )}
                      </div>

                      <Link to={`/blog/${post.slug}`}>
                        <Button className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
                          Read More
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Regular Posts */}
          {regularPosts.length > 0 && (
            <div>
              <h2 className="text-3xl font-bold text-gray-900 mb-8 text-center">Latest Articles</h2>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                {regularPosts.map(post => (
                  <div key={post.id} className="group hover:shadow-lg transition-all duration-300 border rounded-lg p-6 bg-white">
                    <div className="pb-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="secondary" className="text-xs">
                          {post.category}
                        </Badge>
                      </div>
                      <h3 className="text-xl group-hover:text-primary transition-colors line-clamp-2 font-semibold mb-2">
                        {post.title}
                      </h3>
                      <p className="text-gray-600 line-clamp-3">
                        {post.excerpt}
                      </p>
                    </div>
                    <div className="pt-0">
                      <div className="flex items-center justify-between text-sm text-gray-500 mb-4">
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {formatDate(post.publishedAt)}
                          </div>
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {post.readTime}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1 mb-4">
                        {post.tags.slice(0, 3).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                        {post.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{post.tags.length - 3} more
                          </Badge>
                        )}
                      </div>

                      <Link to={`/blog/${post.slug}`}>
                        <Button className="w-full group-hover:bg-primary group-hover:text-white transition-colors">
                          Read More
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* No Results */}
          {filteredPosts.length === 0 && (
            <div className="text-center py-16">
              <h3 className="text-2xl font-semibold text-gray-900 mb-4">No articles found</h3>
              <p className="text-gray-600 mb-6">
                Try adjusting your search terms or filters to find what you're looking for.
              </p>
              <Button onClick={() => {
                setSearchTerm("");
                setSelectedCategory("All");
                setSelectedTag("");
              }}>
                Clear Filters
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* CTA Section */}
      <div className="py-16" style={{ backgroundColor: '#F4EDE2' }}>
        <div className="container mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold mb-4 text-gray-900">Ready to Start Your College Application Journey?</h2>
          <p className="text-xl mb-8 text-gray-600">
            Get personalized guidance and AI-powered essay assistance with Diya AI
          </p>
          <Link to="/auth">
            <Button size="lg" className="hover:shadow-lg transition-all" style={{ backgroundColor: '#D07D00', color: 'white' }}>
              Get Started For Free
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Blog;
