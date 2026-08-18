import { useTranslation } from 'react-i18next';
import Button from './Button.jsx';

function ErrorState({ message, onRetry }) {
  const { t } = useTranslation('common');
  const resolvedMessage = message ?? t('errors.somethingWentWrong');

  return (
    <div role="alert" className="flex flex-col items-center justify-center gap-3 rounded-lg bg-danger/10 py-12 text-center">
      <p className="text-small font-medium text-danger">{resolvedMessage}</p>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          {t('errors.tryAgain')}
        </Button>
      )}
    </div>
  );
}

export default ErrorState;
