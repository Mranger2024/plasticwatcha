import { supabase } from "@/lib/supabase/client";
import { notFound } from "next/navigation";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ReviewForm } from "@/components/review-form";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

async function getContribution(id: string) {
    const { data, error } = await supabase
        .from('contributions')
        .select('*')
        .eq('id', id)
        .single();

    if (error || !data) {
        return null;
    }
    return data;
}

interface PageProps {
    params: { id: string };
    searchParams: { [key: string]: string | string[] | undefined };
}

export default async function ReviewPage({
    params,
}: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const contribution = await getContribution(id);

    if (!contribution) {
        notFound();
    }

    return (
        <div className="container py-8 max-w-5xl mx-auto">
            <div className="mb-6 flex items-center justify-between">
                <div>
                    <Button asChild variant="ghost" size="sm" className="-ml-3 text-muted-foreground hover:text-foreground">
                        <Link href="/admin">
                            <ArrowLeft className="mr-2 h-4 w-4" />
                            Back to Dashboard
                        </Link>
                    </Button>
                    <h1 className="text-2xl font-bold tracking-tight font-mono text-foreground mt-2">
                        Review Contribution
                    </h1>
                    <p className="text-muted-foreground text-sm font-medium">
                        Verify details and classify plastic waste item
                    </p>
                </div>
                <div className="text-right">
                    <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest mb-1">ID</div>
                    <div className="text-sm font-mono font-bold bg-slate-100 px-2 py-1 rounded text-slate-700">
                        {contribution.id.substring(0, 8)}
                    </div>
                </div>
            </div>

            <Card className="shadow-sm overflow-hidden">
                <ReviewForm contribution={contribution} />
            </Card>
        </div>
    );
}
