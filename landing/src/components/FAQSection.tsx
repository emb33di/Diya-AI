import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { useScrollAnimation } from "@/hooks/use-scroll-animation";

const FAQSection = () => {
  const { elementRef: headerRef, isVisible: headerVisible } = useScrollAnimation();
  const { elementRef: faqRef, isVisible: faqVisible } = useScrollAnimation();

  const faqData = [
    {
      question: "What is Diya?",
      answer: "Diya is a fully voice-enabled conversational AI Counselor designed to guide you through the college admissions process. Think of Diya as your personal admissions expert, available 24/7. You can talk to her about your academic goals, personal interests, and career aspirations. She'll help you find the right schools, manage your applications, brainstorm your essays, and keep you on top of your deadlines. As Indian students that have navigated the challenges of applying abroad, we have architected Diya to be an extension of ourselves and our perspectives on the admissions process."
    },
    {
      question: "Why did we build Diya?",
      answer: "After going through the process of applying abroad as Indian students in 2018, we are often approached by friends and family to help guide young students through the same process. Almost always, these students have hired an exorbitantly expensive counselor that has left them out to dry. We built Diya to make sure no student faces this challenge again and so that everyone can afford the best quality of personalized admissions counseling."
    },
    {
      question: "Is Diya for undergraduate AND graduate school admissions?",
      answer: "Yes! Diya is designed to assist students with BOTH undergraduate and graduate programs. In the onboarding conversation, Diya will identify your goals and at what stage of your education journey you are. Based on this, Diya will tailor further questions and guidance accordingly. Furthemore, when you write your essays, Diya will provide guidance based specifically on whether you are applying to undergraduate or graduate school. For example, if you are applying for your MBA, Diya specifically guide you to build a story from your resume and help you identify yours goals for the MBA program."
    },
    {
      question: "How does Diya create a school list for me?",
      answer: "Just like a real counselor, Diya spends time talking to you to understand your needs. As you talk to her, she learns about your academic record, desired major, extracurricular activities, and what you're looking for in a college—like location, size, and campus culture. Based on this information, she generates a personalized list of schools that are a great fit for you."
    },
    {
      question: "Can Diya help me with my essays?",
      answer: "Yes! For every school on your list, Diya can help you with your essays. She'll retrieve the specific essay prompts for each application and then work with you to brainstorm ideas. You can discuss your experiences and thoughts with her just like with a real counselor, and she will help you organize your ideas and develop a strong outline for your essay. She also remembers all your past conversations and stories and suggests you ideas based on that."
    },
    {
      question: "How does Diya track deadlines?",
      answer: "After your school list is finalized, Diya automatically retrieves and tracks all relevant deadlines for each application, including early action, early decision, regular decision, and financial aid deadlines. She'll send you reminders and help you stay on track so you never miss a submission date."
    },
    {
      question: "How is Diya different from using a general AI like ChatGPT?",
      answer: "While ChatGPT is a powerful general-purpose tool, Diya is a highly specialized and hyper-personalized expert. Think of it this way: ChatGPT is a brilliant generalist, while Diya is a dedicated, experienced admissions counselor.\n\nHere's what makes Diya different:\n\n• <strong>She's built for you.</strong> Diya's entire purpose is to help with college applications. She's trained on a massive, specific dataset that includes everything from college application requirements and essay prompts to historical admissions data and success stories. She's not just a language model; she's a domain-specific expert.\n\n• <strong>She remembers you.</strong> Unlike ChatGPT, which has a limited memory of your conversation, Diya builds a continuous, evolving profile of you. She learns your preferences, goals, and interests over time, allowing her to provide increasingly accurate and personalized advice. This personalization is what allows her to truly act as a counselor, not just a search engine.\n\n• <strong>She takes action for you.</strong> Diya doesn't just give you information; she actively manages your process. She creates a personalized school list, retrieves the specific application materials you need, and actively tracks deadlines for you, sending reminders to ensure nothing falls through the cracks.\n\n• <strong>She guides you, but doesn't write for you.</strong> Diya is designed to be a collaborative partner in your essay-writing process. Most colleges have a policy against AI written essays, and we have specifically designed Diya to be compliant with such ethical requirements. Diya uses the breadth of knowledge she learns about you to help you brainstorm and refine your unique story without generating generic, AI-sounding content that admissions officers can easily spot. She's built to help your voice shine through, not to replace it."
    },
    {
      question: "Why is Diya uniquely suited for Indian students applying to top schools?",
      answer: "Diya is built by a team of Indian Ivy League alumni who have navigated this exact process. We understand the intricacies and nuances of the application journey specifically for students from India.\n\nThis includes:\n\n• <strong>Translating your academic background:</strong> Diya is trained to understand Indian academic systems, from board exams to specific school curriculums, and help you present your achievements in a way that resonates with U.S. and U.K. admissions officers.\n\n• <strong>Highlighting your unique story:</strong> Diya knows how to help you showcase your extracurriculars and experiences in a compelling way that stands out in a competitive applicant pool.\n\n• <strong>Navigating cultural and logistical hurdles:</strong> From securing strong letters of recommendation to understanding financial aid options for international students, Diya provides guidance that is tailored to your specific situation.\n\nWe know the process because we've lived it. Diya is built on that firsthand experience, giving you an edge that a general-purpose AI simply can't."
    }
  ];

  return (
    <section id="faq" className="py-12 sm:py-16 md:py-20 lg:py-24 px-4 sm:px-6">
      <div className="max-w-4xl lg:max-w-5xl mx-auto">
        <div ref={headerRef} className={`text-center mb-12 sm:mb-16 md:mb-20 scroll-fade-in ${headerVisible ? 'animate' : ''}`}>
          <h2 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-foreground font-inter mb-4 sm:mb-6 bg-gradient-to-r from-primary to-primary-glow bg-clip-text text-transparent leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed px-2">
            Some things you need to know about Diya and how she works to guide you through your college admissions journey
          </p>
        </div>
        
        <div ref={faqRef} className={`rounded-2xl sm:rounded-3xl p-4 sm:p-6 md:p-8 scroll-scale-in ${faqVisible ? 'animate' : ''}`}>
          <Accordion type="single" collapsible className="w-full space-y-3 sm:space-y-4">
            {faqData.map((faq, index) => (
              <AccordionItem 
                key={index} 
                value={`item-${index}`} 
                className="border border-border/30 rounded-xl sm:rounded-2xl overflow-hidden bg-background/80 hover:bg-background/90 transition-all duration-300 hover:shadow-lg hover:border-primary/30 active:scale-[0.98] touch-manipulation"
              >
                <AccordionTrigger className="text-left text-base sm:text-lg md:text-xl font-semibold text-foreground hover:text-primary transition-all py-4 sm:py-5 md:py-6 px-4 sm:px-6 no-underline hover:no-underline group min-h-[60px] sm:min-h-[70px] flex items-center">
                  <span className="group-hover:translate-x-1 transition-transform duration-200 pr-4 leading-tight">
                    {faq.question}
                  </span>
                </AccordionTrigger>
                <AccordionContent className="text-muted-foreground leading-relaxed pb-4 sm:pb-6 px-4 sm:px-6">
                  <div 
                    className="whitespace-pre-line text-sm sm:text-base md:text-lg leading-6 sm:leading-7 md:leading-8" 
                    dangerouslySetInnerHTML={{ __html: faq.answer }} 
                  />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      </div>
    </section>
  );
};

export default FAQSection;
