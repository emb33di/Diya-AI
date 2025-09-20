import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import "@/styles/landing.css";


const About = () => {
  const founders = [
    {
      name: "Pranit Gupta",
      initials: "PG",
      education: "Dartmouth College",
      current: "Software Engineer at Palantir",
      description: "Pranit studied Computer Science at Dartmouth College and currently works as a Forward Deployed Engineer at Palantir. His experience navigating the competitive college admissions process and working with data-driven solutions inspired him to create Diya."
    },
    {
      name: "Mihir Bedi",
      initials: "MB",
      education: "University of Chicago • Harvard Law School",
      current: "Harvard Law Student",
      description: "Mihir completed his undergraduate studies in Economics at the University of Chicago and is currently pursuing his JD at Harvard Law School. His journey through multiple elite institutions gives him unique insights into what admissions committees are looking for."
    }
  ];

  const faqs = [
    {
      question: "Why did we build Diya?",
      answer: "We believe that high-quality college counseling should be democratized and accessible to all students, regardless of their economic background. Traditional college counseling can cost thousands of dollars, creating barriers for many deserving students. Diya combines our expertise with AI technology to provide personalized, comprehensive guidance at a fraction of the cost."
    },
    {
      question: "Why can't I just use ChatGPT?",
      answer: "While ChatGPT is a powerful general-purpose tool, Diya is specifically trained on college admissions data and reflects our combined perspectives from having successfully navigated admissions to top institutions. We personalize everything based on your unique profile, goals, and writing style. Our AI understands the nuances of what different schools are looking for and provides targeted advice that generic AI tools simply cannot match."
    }
  ];

  return (
    <div className="landing-page min-h-screen bg-black">
      <div className="bg-gradient-to-br from-background via-primary/5 to-secondary/10 p-4 min-h-screen">
      <div className="container mx-auto px-6 py-16 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)]">
        {/* Header Section */}
        <div className="text-center mb-16">
          <h1 className="text-4xl font-display font-bold mb-4">
            About Diya
          </h1>
          <p className="text-xl text-muted-foreground max-w-3xl mx-auto">
            Founded by Ivy League alumni who understand the college admissions journey firsthand
          </p>
        </div>

        {/* Founders Section */}
        <div className="mb-20">
          <h2 className="text-3xl font-display font-bold text-center mb-12">Meet Our Founders</h2>
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            {founders.map((founder, index) => (
              <Card key={index} className="text-center hover:shadow-lg transition-shadow">
                <CardHeader className="pb-4">
                  <div className="flex justify-center mb-4">
                    <Avatar className="h-24 w-24">
                      <AvatarFallback className="text-2xl font-bold bg-gradient-primary text-primary-foreground">
                        {founder.initials}
                      </AvatarFallback>
                    </Avatar>
                  </div>
                  <CardTitle className="text-2xl">{founder.name}</CardTitle>
                  <CardDescription className="text-lg">
                    {founder.education}
                  </CardDescription>
                  <p className="text-primary font-medium">{founder.current}</p>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed">
                    {founder.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="max-w-4xl mx-auto">
          <h2 className="text-3xl font-display font-bold text-center mb-12">Frequently Asked Questions</h2>
          <div className="space-y-8">
            {faqs.map((faq, index) => (
              <Card key={index}>
                <CardHeader>
                  <CardTitle className="text-xl">{faq.question}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground leading-relaxed text-lg">
                    {faq.answer}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Mission Statement */}
        <div className="text-center mt-20 bg-muted/30 rounded-lg p-12">
          <h3 className="text-2xl font-display font-bold mb-4">Our Mission</h3>
          <p className="text-lg text-muted-foreground max-w-3xl mx-auto leading-relaxed">
            To level the playing field in college admissions by providing world-class guidance that adapts to each student's unique journey, dreams, and potential.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
};

export default About;