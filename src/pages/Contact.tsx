import { Card, CardContent } from "@/components/ui/card";
import { Mail, Phone, Calendar } from "lucide-react";

const Contact = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-secondary/10">
      <div className="container mx-auto px-6 py-16">
        <div className="max-w-4xl mx-auto">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-4xl font-display font-bold mb-4">
              Contact
            </h1>
            <p className="text-xl text-muted-foreground">
              Get in touch with us
            </p>
          </div>

          {/* Founder Photo */}
          <div className="flex justify-center mb-12">
            <div className="w-48 h-48 rounded-full overflow-hidden border-4 border-primary/20 shadow-lg">
              <img 
                src="/founder_pic.jpeg"
                alt="Mihir Bedi - Founder" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 200 200'%3E%3Crect width='200' height='200' fill='%23f3f4f6'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' font-family='Arial, sans-serif' font-size='16' fill='%236b7280'%3EAdd Founder Photo%3C/text%3E%3C/svg%3E";
                }}
              />
            </div>
          </div>

          {/* Calendar Link - Centered */}
          <div className="flex justify-center mb-8">
            <Card className="hover:shadow-lg transition-shadow w-full max-w-md">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Schedule a Meeting</h3>
                    <a 
                      href="https://cal.com/mihir-diya-ai" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      cal.com/mihir-diya-ai
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Cards */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Email Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Mail className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Email</h3>
                    <a 
                      href="mailto:mihir@meetdiya.com" 
                      className="text-primary hover:underline"
                    >
                      mihir@meetdiya.com
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Phone Card */}
            <Card className="hover:shadow-lg transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                    <Phone className="h-6 w-6 text-primary" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg mb-1">Phone</h3>
                    <a 
                      href="tel:+18703141331" 
                      className="text-primary hover:underline"
                    >
                      +1 (870) 314-1331
                    </a>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Contact;

