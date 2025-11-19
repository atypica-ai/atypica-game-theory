"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface StudiesByFeedbackProps {
  feedback: {
    useful: number;
    not_useful: number;
    no_feedback: number;
  };
}

export function StudiesByFeedback({ feedback }: StudiesByFeedbackProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Studies by Feedback</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2">
          <li className="flex justify-between items-center text-sm p-2 rounded bg-green-100 dark:bg-green-900/30">
            <span className="font-medium">👍 Useful</span>
            <span className="font-bold">{feedback.useful.toLocaleString()}</span>
          </li>
          <li className="flex justify-between items-center text-sm p-2 rounded bg-red-100 dark:bg-red-900/30">
            <span className="font-medium">👎 Not Useful</span>
            <span className="font-bold">{feedback.not_useful.toLocaleString()}</span>
          </li>
          <li className="flex justify-between items-center text-sm p-2 rounded bg-gray-100 dark:bg-gray-700/30">
            <span className="font-medium">💬 No Feedback</span>
            <span className="font-bold">{feedback.no_feedback.toLocaleString()}</span>
          </li>
        </ul>
      </CardContent>
    </Card>
  );
}
