import { Button } from "@/components/ui/button";
import { analytics } from "@/utils/analytics";

const DebugErrors = () => {
  if (import.meta.env.PROD) {
    return null; // Hide in production
  }

  const simulateError = (
    type: string,
    message: string,
    context?: Record<string, any>
  ) => {
    analytics.trackError(type, message, context);
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">Analytics Debug Panel</h1>
      
      <div className="space-y-4">
        <section className="border p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Simulate Errors</h2>
          <div className="grid gap-4">
            <Button
              variant="outline"
              onClick={() =>
                simulateError("network_error", "Voice connection failed", {
                  source: "voice_engine",
                  level: "error",
                  user_action: "starting_onboarding",
                })
              }
            >
              Simulate Network Error
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                simulateError("validation_error", "Invalid essay format", {
                  source: "essay_editor",
                  level: "warning",
                  word_count: 800,
                })
              }
            >
              Simulate Validation Warning
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                simulateError("api_error", "Failed to save changes", {
                  source: "profile_service",
                  level: "critical",
                  retry_count: 3,
                })
              }
            >
              Simulate Critical API Error
            </Button>
          </div>
        </section>

        <section className="border p-4 rounded-lg">
          <h2 className="text-lg font-semibold mb-4">Simulate Events</h2>
          <div className="grid gap-4">
            <Button
              variant="outline"
              onClick={() =>
                analytics.trackConversion("paid_upgrade", 99, {
                  plan: "premium",
                })
              }
            >
              Track Conversion
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                analytics.trackMilestone("first_essay", {
                  word_count: 650,
                })
              }
            >
              Track Milestone
            </Button>

            <Button
              variant="outline"
              onClick={() =>
                analytics.trackPerformance("load_time", 1.2, {
                  context: "essay_editor",
                })
              }
            >
              Track Performance
            </Button>
          </div>
        </section>

        <section className="border p-4 rounded-lg bg-gray-50">
          <h2 className="text-lg font-semibold mb-4">Debug Tips</h2>
          <ul className="list-disc list-inside space-y-2">
            <li>Enable debug mode: Set VITE_ANALYTICS_DEBUG=true</li>
            <li>Watch console for: 📊 Events, 📄 Pages, 🚨 Errors</li>
            <li>Use GA4 DebugView to verify events arrive</li>
            <li>Check README_ANALYTICS.md for more tips</li>
          </ul>
        </section>
      </div>
    </div>
  );
};

export default DebugErrors;
