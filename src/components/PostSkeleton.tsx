import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export const PostSkeleton = () => {
  return (
    <Card className="border-border/50">
      <CardContent className="p-4">
        {/* User Info Skeleton */}
        <div className="flex items-center gap-3 mb-3">
          <Skeleton className="w-10 h-10 rounded-full" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
          <Skeleton className="w-6 h-6" />
        </div>

        {/* Post Content Skeleton */}
        <div className="space-y-2 mb-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>

        {/* Music Player Card Skeleton */}
        <Card className="mb-3 border-border/30 bg-muted/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-3">
              <Skeleton className="w-12 h-12 rounded-md" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
              </div>
              <div className="flex items-center gap-2">
                <Skeleton className="w-8 h-8 rounded-full" />
                <Skeleton className="w-16 h-4" />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons Skeleton */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-8" />
            <Skeleton className="w-16 h-8" />
            <Skeleton className="w-16 h-8" />
            <Skeleton className="w-16 h-8" />
          </div>
          <Skeleton className="w-20 h-8" />
        </div>
      </CardContent>
    </Card>
  );
};

// Multiple skeleton posts for loading state
export const PostSkeletonList = ({ count = 3 }: { count?: number }) => {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <PostSkeleton key={i} />
      ))}
    </>
  );
};