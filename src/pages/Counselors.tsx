import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import DynamicBackground from "@/components/DynamicBackground";
import "@/styles/landing.css";

const Counselors = () => {
  return (
    <div className="landing-page min-h-screen bg-black font-instrument-sans relative">
      <DynamicBackground />
      <div className="relative z-10">
        <div className="container mx-auto px-6 py-16 flex flex-col items-center justify-center min-h-screen">
          {/* Header Section */}
          <div className="text-center mb-12 sm:mb-16">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-display font-bold mb-4 sm:mb-6 leading-tight">
              For Counselors
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto leading-relaxed">
              Empower your students with our AI-powered student management system
            </p>
          </div>

          {/* Counselor Demo Video */}
          <div className="flex flex-col items-center w-full mb-12 sm:mb-16">
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-semibold mb-6 sm:mb-8 text-center">
              See it in action
            </h2>
            <div className="w-full max-w-[90%] sm:max-w-md md:max-w-2xl lg:max-w-2xl xl:max-w-3xl 2xl:max-w-4xl">
              <div className="relative rounded-xl sm:rounded-2xl overflow-hidden bg-black shadow-[0_0_40px_hsl(var(--primary)/0.4)] hover:shadow-[0_0_60px_hsl(var(--primary)/0.6)] transition-all duration-500">
                <video
                  className="w-full h-auto block"
                  src="/Website Previews/Counselor Demo.mp4"
                  autoPlay
                  loop
                  muted
                  playsInline
                  aria-label="Counselor demo video"
                />
              </div>
            </div>
          </div>

          {/* Book Demo Button */}
          <div className="mb-12 sm:mb-16 md:mb-20">
            <Button
              asChild
              variant="hero"
              size="lg"
              className="text-base sm:text-lg px-8 py-6"
            >
              <a
                href="https://cal.com/mihir-diya-ai"
                target="_blank"
                rel="noopener noreferrer"
              >
                Book a Meeting Today
              </a>
            </Button>
          </div>

          {/* Features Section */}
          <div className="max-w-6xl mx-auto mb-12 sm:mb-16 md:mb-20 px-4">
            <div className="grid md:grid-cols-2 gap-6 sm:gap-8">
              <Card className="hover:shadow-[0_0_40px_hsl(var(--primary)/0.2)] hover:border-primary/40 transition-all duration-300 backdrop-blur-xl bg-gradient-to-b from-primary/5 to-primary/10 border-primary rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl sm:text-2xl font-bold leading-tight">
                    Manage all your students' materials
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                    No more juggling materials over emails! Students can write their essays within the platform and send it to you for review in the click of a button, allowing you to review in the platform.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-[0_0_40px_hsl(var(--primary)/0.2)] hover:border-primary/40 transition-all duration-300 backdrop-blur-xl bg-gradient-to-b from-primary/5 to-primary/10 border-primary rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl sm:text-2xl font-bold leading-tight">
                    AI-powered assistance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                    Students can use a responsibly designed AI to help them with a first draft of their essays, allowing them to send you more polished versions.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-[0_0_40px_hsl(var(--primary)/0.2)] hover:border-primary/40 transition-all duration-300 backdrop-blur-xl bg-gradient-to-b from-primary/5 to-primary/10 border-primary rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl sm:text-2xl font-bold leading-tight">
                    Deeply Personalized Analytics
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                    Get detailed analytics on student progress and strengths, while also understanding the main questions your students have.
                  </p>
                </CardContent>
              </Card>

              <Card className="hover:shadow-[0_0_40px_hsl(var(--primary)/0.2)] hover:border-primary/40 transition-all duration-300 backdrop-blur-xl bg-gradient-to-b from-primary/5 to-primary/10 border-primary rounded-xl">
                <CardHeader className="pb-4">
                  <CardTitle className="text-xl sm:text-2xl font-bold leading-tight">
                    Less Admin, More Time With Your Students
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-base sm:text-lg text-muted-foreground leading-relaxed">
                    With diya you can spend all your time on what truly matters, guiding your students. Let us take care of all the administrative side of student management.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Counselors;

