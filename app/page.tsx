import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Home,
  MessageSquare,
  MapPin,
  DollarSign,
  Calendar,
} from "lucide-react";

const features = [
  {
    icon: MessageSquare,
    title: "AI Rental Assistant",
    description:
      "Chat with an AI that understands your preferences and searches listings in real time.",
  },
  {
    icon: MapPin,
    title: "Interactive Map",
    description:
      "Explore LA neighborhoods with map, grid, and list views plus powerful filtering.",
  },
  {
    icon: DollarSign,
    title: "Cost Estimation",
    description:
      "Detailed breakdowns including rent, utilities, parking, and LA-specific fees.",
  },
  {
    icon: Calendar,
    title: "Schedule Viewings",
    description:
      "Book apartment tours and manage all your viewings in one place.",
  },
];

const steps = [
  {
    number: 1,
    title: "Tell Us What You Need",
    description:
      "Describe your ideal rental in natural language — budget, neighborhood, must-haves.",
  },
  {
    number: 2,
    title: "Explore Results",
    description:
      "Browse matching listings on an interactive map with filters and detailed info.",
  },
  {
    number: 3,
    title: "Schedule & Move In",
    description:
      "Book viewings, get cost estimates, and secure your new home.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-2">
            <Home className="h-6 w-6 text-primary" />
            <span className="text-lg font-semibold">LA Rent Finder</span>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" asChild>
              <Link href="/auth/login">Sign In</Link>
            </Button>
            <Button asChild>
              <Link href="/auth/signup">Get Started</Link>
            </Button>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-24 text-center">
        <div className="mx-auto max-w-3xl">
          <Badge variant="secondary" className="mb-4">
            Powered by AI
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Find Your Perfect Rental in{" "}
            <span className="text-primary">Los Angeles</span>
          </h1>
          <p className="mt-6 text-lg text-muted-foreground">
            An AI-powered assistant that helps you search listings, explore
            neighborhoods on an interactive map, and get detailed cost estimates
            — all in one place.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/auth/signup">Get Started Free</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">Learn More</Link>
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="bg-muted/50 px-6 py-20">
        <div className="mx-auto max-w-6xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            Everything You Need to Find Home
          </h2>
          <div className="grid gap-6 sm:grid-cols-2">
            {features.map((feature) => (
              <Card key={feature.title}>
                <CardHeader>
                  <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <feature.icon className="h-5 w-5 text-primary" />
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20">
        <div className="mx-auto max-w-4xl">
          <h2 className="mb-12 text-center text-3xl font-bold">
            How It Works
          </h2>
          <div className="grid gap-10 sm:grid-cols-3">
            {steps.map((step) => (
              <div key={step.number} className="text-center">
                <div className="mx-auto mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                  {step.number}
                </div>
                <h3 className="mb-2 text-lg font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-muted/50 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold">Ready to Find Your New Home?</h2>
          <p className="mt-4 text-muted-foreground">
            Join thousands of renters using AI to find their perfect place in
            LA.
          </p>
          <Button size="lg" className="mt-8" asChild>
            <Link href="/auth/signup">Get Started Free</Link>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t px-6 py-6 text-center text-sm text-muted-foreground">
        &copy; {new Date().getFullYear()} LA Rent Finder. All rights reserved.
      </footer>
    </div>
  );
}
