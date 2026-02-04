import { redirect } from 'next/navigation';

export default function ReviewPage() {
    // Redirect to dashboard for now since review queue is in dashboard
    redirect('/dashboard');
}
