import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

const SettingsSkeleton = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar Skeleton */}
      <nav className="border-b border-border/50 px-6 py-4">
        <div className="container mx-auto flex items-center justify-between">
          <Skeleton className="h-8 w-32" />
          <div className="flex items-center gap-4">
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-20" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="pt-16">
        <div className="container mx-auto px-6 py-6">
          {/* Header */}
          <div className="mb-8">
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-6 w-96" />
          </div>

          <div className="max-w-4xl mx-auto space-y-8">
            {/* Profile Header Skeleton */}
            <div className="relative">
              {/* Banner Skeleton */}
              <Skeleton className="h-48 w-full rounded-2xl" />

              {/* Profile Picture & Basic Info Skeleton */}
              <div className="relative -mt-16 px-6">
                <div className="flex items-end gap-6">
                  <Skeleton className="w-32 h-32 rounded-full border-4 border-background" />
                  <div className="flex-1 pb-4 space-y-2">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-8 w-48" />
                      <Skeleton className="h-6 w-20" />
                      <Skeleton className="h-6 w-16" />
                    </div>
                    <Skeleton className="h-5 w-32" />
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-4 w-28" />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Profile Stats Cards Skeleton */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="bg-card border rounded-xl p-4 text-center shadow-sm">
                  <Skeleton className="h-8 w-12 mx-auto mb-2" />
                  <Skeleton className="h-4 w-16 mx-auto" />
                </div>
              ))}
            </div>

            {/* Settings Sections Skeleton */}
            <div className="space-y-6">
              {/* Basic Information Section */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <Skeleton className="h-6 w-40" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-12 w-full rounded-xl" />
                  </div>
                </div>
                <div className="space-y-2 mt-6">
                  <Skeleton className="h-4 w-12" />
                  <Skeleton className="h-24 w-full rounded-xl" />
                </div>
                <div className="space-y-2 mt-6">
                  <Skeleton className="h-4 w-16" />
                  <Skeleton className="h-12 w-full rounded-xl" />
                </div>
              </Card>

              {/* Social Links Section */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <Skeleton className="h-6 w-32" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Array.from({ length: 8 }, (_, i) => (
                    <div key={i} className="space-y-2">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                    </div>
                  ))}
                </div>
              </Card>

              {/* Music Preferences Section */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <Skeleton className="h-6 w-40" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-4 w-28" />
                  <div className="flex flex-wrap gap-3">
                    {Array.from({ length: 10 }, (_, i) => (
                      <Skeleton key={i} className="h-8 w-20 rounded-full" />
                    ))}
                  </div>
                </div>
              </Card>

              {/* Account Information Section */}
              <Card className="p-6">
                <div className="flex items-center gap-3 mb-6">
                  <Skeleton className="w-10 h-10 rounded-xl" />
                  <Skeleton className="h-6 w-48" />
                </div>
                <div className="space-y-4">
                  <Skeleton className="h-16 w-full rounded-xl" />
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className="p-4 bg-muted/30 rounded-xl text-center">
                        <Skeleton className="h-6 w-16 mx-auto mb-2" />
                        <Skeleton className="h-4 w-12 mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
              </Card>

              {/* Save Button Skeleton */}
              <div className="flex justify-center pt-6">
                <Skeleton className="h-12 w-48 rounded-xl" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default SettingsSkeleton;