// Update this page (the content is just a fallback if you fail to update the page)
import { Link } from "react-router-dom";
const Index = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-accent/20 to-background">
      <div className="text-center max-w-2xl mx-auto p-8">
        <div className="mb-8">
          <div className="flex items-center justify-center mb-6">
            <div className="bg-primary rounded-full p-4">
              <svg className="h-12 w-12 text-primary-foreground" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            </div>
          </div>
          <h1 className="text-5xl font-bold mb-4 bg-gradient-to-r from-primary to-primary/80 bg-clip-text text-transparent">
            EDHMS
          </h1>
          <p className="text-xl text-muted-foreground mb-8">
            Emergency Healthcare Management System
          </p>
          <p className="text-lg text-muted-foreground/80 mb-8">
            Centralized healthcare data management with AI-powered insights for emergency situations
          </p>
        </div>
        
        <div className="space-y-4">
          <a 
            href="/auth" 
            className="inline-flex items-center justify-center rounded-md bg-primary px-8 py-3 text-sm font-medium text-primary-foreground shadow transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50"
          >
            <Link to="/auth">Access Emergency Dashboard</Link>
          </a>
          <div className="flex items-center justify-center space-x-8 mt-8 text-sm text-muted-foreground">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Real-time Monitoring</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>AI-Powered Analytics</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-primary rounded-full"></div>
              <span>Secure & Compliant</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Index;
