import { useState } from 'react';

function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  function handleSubmit(event) {
    event.preventDefault();
    setMessage("Newsletter signup isn't available yet — check back soon.");
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2">
      <label htmlFor="newsletter-email" className="text-small font-semibold text-white">
        Subscribe to our newsletter
      </label>
      <div className="flex gap-2">
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="w-full rounded-search border border-white/20 bg-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/50 focus:border-white focus:outline-none focus:ring-2 focus:ring-white"
        />
        <button
          type="submit"
          className="shrink-0 rounded-btn bg-white px-4 py-2.5 text-btn text-navy-900 transition hover:bg-white/90"
        >
          Subscribe
        </button>
      </div>
      {message && (
        <p role="status" className="text-small text-white/70">
          {message}
        </p>
      )}
    </form>
  );
}

export default NewsletterForm;
