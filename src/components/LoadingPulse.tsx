export const LoadingPulse = () => {
  return (
    <div className="inline-flex gap-1">
      <span className="animate-bounce">·</span>
      <span className="animate-bounce [animation-delay:0.2s]">·</span>
      <span className="animate-bounce [animation-delay:0.4s]">·</span>
    </div>
  );
};
