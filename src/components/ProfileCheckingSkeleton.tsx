import { Skeleton } from "@/components/ui/skeleton";

const ProfileCheckingSkeleton = () => {
  return (
    <div className="min-h-screen bg-background font-clash">
      {/* Header Skeleton */}
      <header className="fixed top-0 left-0 right-0 z-50 px-6 py-2 backdrop-blur-md bg-transparent">
        <nav className="container mx-auto flex items-center justify-between">
          <Skeleton className="w-17 h-12" />
          <Skeleton className="h-10 w-24" />
        </nav>
      </header>

      {/* Hero Section Skeleton */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden pt-16">
        <div className="absolute inset-0 bg-gradient-to-br from-muted/20 via-background/50 to-background"></div>
        <div className="container mx-auto px-6 py-32 relative z-10 text-center">
          <div className="max-w-4xl mx-auto space-y-8">
            <Skeleton className="h-16 md:h-20 lg:h-24 w-full mx-auto" />
            <Skeleton className="h-6 w-3/4 mx-auto" />
            <div className="flex justify-center gap-4 mt-6">
              <Skeleton className="h-12 w-32" />
              <Skeleton className="w-6 h-6" />
            </div>
          </div>
        </div>
      </section>

      {/* Partners Section Skeleton */}
      <section className="py-16 border-t border-border/20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-12">
            <Skeleton className="h-8 w-48 mx-auto mb-4" />
            <Skeleton className="h-4 w-96 mx-auto" />
          </div>
          <div className="flex justify-center items-center gap-8">
            {Array.from({ length: 6 }, (_, i) => (
              <Skeleton key={i} className="w-24 h-12" />
            ))}
          </div>
        </div>
      </section>

      {/* Marketplace Section Skeleton */}
      <section className="pt-8 pb-16 md:pb-24 relative overflow-hidden border-t border-border/20">
        <div className="absolute inset-0 bg-gradient-to-b from-muted/20 via-background/50 to-background"></div>
        <div className="container mx-auto px-6 relative z-10">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-3 mb-3">
              <Skeleton className="w-5 h-5" />
              <Skeleton className="h-8 w-64" />
            </div>
            <Skeleton className="h-4 w-96 mx-auto" />
          </div>

          {/* Trending Section */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Skeleton className="w-4 h-4" />
              <Skeleton className="h-6 w-32" />
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="border border-border/50 rounded-lg p-3 space-y-2">
                  <Skeleton className="w-full aspect-square rounded-md" />
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-3 w-16" />
                  <Skeleton className="h-4 w-12" />
                </div>
              ))}
            </div>
          </div>

          {/* Main Content Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Social Feed - Left Side */}
            <div className="lg:col-span-2">
              <div className="space-y-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="border border-border/50 rounded-lg p-4 space-y-3">
                    {/* User Info */}
                    <div className="flex items-center gap-3">
                      <Skeleton className="w-8 h-8 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-3 w-16" />
                      </div>
                      <Skeleton className="w-6 h-6" />
                    </div>

                    {/* Description */}
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-3/4" />

                    {/* Music Player Card */}
                    <div className="border border-border/30 rounded-lg p-3 bg-muted/30">
                      <div className="flex items-center gap-3">
                        <Skeleton className="w-12 h-12 rounded-md" />
                        <div className="flex-1 space-y-2">
                          <Skeleton className="h-4 w-32" />
                          <Skeleton className="h-3 w-20" />
                          <Skeleton className="h-1 w-full rounded-full" />
                        </div>
                        <Skeleton className="w-8 h-8 rounded-full" />
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <Skeleton className="w-16 h-8" />
                        <Skeleton className="w-16 h-8" />
                        <Skeleton className="w-16 h-8" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Skeleton className="w-16 h-8" />
                        <Skeleton className="w-6 h-6" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right Side Content */}
            <div className="lg:col-span-1">
              <div className="sticky top-8 space-y-6">
                {/* Featured Artist */}
                <div className="border border-border/50 rounded-lg p-4 bg-background/80 backdrop-blur-sm space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <div className="flex items-center gap-3">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <div className="space-y-1">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-3 w-20" />
                    </div>
                  </div>
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-3/4" />
                  <Skeleton className="h-8 w-full" />
                </div>

                {/* Music Genres */}
                <div className="border border-border/50 rounded-lg p-4 bg-background/80 backdrop-blur-sm space-y-3">
                  <Skeleton className="h-6 w-32" />
                  <div className="flex gap-2">
                    {Array.from({ length: 6 }, (_, i) => (
                      <Skeleton key={i} className="h-6 w-16" />
                    ))}
                  </div>
                </div>

                {/* Trending Topics */}
                <div className="border border-border/50 rounded-lg p-4 bg-background/80 backdrop-blur-sm space-y-3">
                  <Skeleton className="h-6 w-32" />
                  {Array.from({ length: 4 }, (_, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  ))}
                </div>

                {/* Community Stats */}
                <div className="border border-border/50 rounded-lg p-4 bg-background/80 backdrop-blur-sm space-y-3">
                  <Skeleton className="h-6 w-24" />
                  {Array.from({ length: 3 }, (_, i) => (
                    <div key={i} className="flex justify-between items-center">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-12" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer Skeleton */}
      <footer className="border-t border-border/20 py-12">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="space-y-4">
                <Skeleton className="h-6 w-24" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-4 w-28" />
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            ))}
          </div>
          <div className="border-t border-border/20 pt-8 flex flex-col md:flex-row justify-between items-center">
            <Skeleton className="h-4 w-48" />
            <div className="flex gap-4 mt-4 md:mt-0">
              <Skeleton className="w-6 h-6" />
              <Skeleton className="w-6 h-6" />
              <Skeleton className="w-6 h-6" />
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ProfileCheckingSkeleton;