// # TODO: Real authentication (FastAPI + JWT) gets wired in during the backend round.
// This route currently serves presentation-round mock authentication.

import LoginForm from "../../components/LoginForm";

export const metadata = {
  title: "Sign In — Email Threat Intelligence & Forensic Platform",
  description: "Analyst authentication portal for Email Threat Intelligence and Forensic Analysis",
};

export default function LoginPage() {
  return (
    <div
      data-auth-page="true"
      className="min-h-screen w-full flex items-center justify-center p-4 bg-canvas"
    >
      <style
        dangerouslySetInnerHTML={{
          __html: `
            aside { display: none !important; }
          `,
        }}
      />
      <LoginForm />
    </div>
  );
}
