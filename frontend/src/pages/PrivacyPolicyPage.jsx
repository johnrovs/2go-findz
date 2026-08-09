import StaticPageLayout from '../components/StaticPageLayout.jsx';

function PrivacyPolicyPage() {
  return (
    <StaticPageLayout title="Privacy Policy">
      <p>
        2Go Findz does not require an account or collect personal information to browse this site. We
        use a temporary, anonymous session identifier stored in your browser to understand which
        products are viewed and clicked, so we can improve the recommendations we show.
      </p>
      <p>
        When you follow a product link, you leave 2Go Findz and are subject to Amazon&apos;s own
        privacy policy. We do not control, and are not responsible for, data collected on Amazon or any
        other third-party site.
      </p>
      <p>We do not sell or share any information we collect with third parties.</p>
    </StaticPageLayout>
  );
}

export default PrivacyPolicyPage;
