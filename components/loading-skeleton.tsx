export function LoadingSkeleton() {
    return (
        <div className="min-h-screen bg-gradient-to-br from-background via-muted/20 to-background animate-pulse">
            <div className="container mx-auto px-4 py-8">
                <div className="h-8 w-64 bg-muted rounded mb-8"></div>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {[1, 2, 3, 4, 5, 6].map((i) => (
                        <div key={i} className="bg-card rounded-lg p-6 space-y-4">
                            <div className="h-6 w-3/4 bg-muted rounded"></div>
                            <div className="h-4 w-full bg-muted rounded"></div>
                            <div className="h-4 w-5/6 bg-muted rounded"></div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

export function DashboardSkeleton() {
    return (
        <div className="space-y-6 p-6 animate-pulse">
            <div className="flex items-center justify-between">
                <div className="h-8 w-48 bg-muted rounded"></div>
                <div className="h-10 w-32 bg-muted rounded"></div>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="bg-card rounded-lg p-6">
                        <div className="h-4 w-24 bg-muted rounded mb-2"></div>
                        <div className="h-8 w-16 bg-muted rounded"></div>
                    </div>
                ))}
            </div>
            <div className="bg-card rounded-lg p-6 space-y-4">
                <div className="h-6 w-32 bg-muted rounded"></div>
                {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-4 p-4 bg-muted/50 rounded">
                        <div className="h-12 w-12 bg-muted rounded"></div>
                        <div className="flex-1 space-y-2">
                            <div className="h-4 w-3/4 bg-muted rounded"></div>
                            <div className="h-3 w-1/2 bg-muted rounded"></div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}
