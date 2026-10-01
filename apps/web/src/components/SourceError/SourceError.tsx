export function SourceError({
  message,
  onRetry,
  onSwitch,
}: {
  message: string;
  onRetry?: () => void;
  onSwitch?: () => void;
}) {
  return (
    <div className="banner error" role="alert">
      <p>{message}</p>
      <div className="row">
        {onRetry ? <button type="button" onClick={onRetry}>Ще раз</button> : null}
        {onSwitch ? <button type="button" className="ghost" onClick={onSwitch}>Інше джерело</button> : null}
      </div>
    </div>
  );
}
