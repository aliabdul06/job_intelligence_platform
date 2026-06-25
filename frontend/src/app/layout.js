import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export const metadata = {
  title: 'JobIntel — AI-Powered Job Market Intelligence',
  description: 'Explore AI & Data job market trends, skill analytics, regional insights, and personalized job recommendations powered by NLP analysis.',
  keywords: 'job intelligence, AI jobs, data science, machine learning, skill analytics, job market trends',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main className="page-wrapper">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
