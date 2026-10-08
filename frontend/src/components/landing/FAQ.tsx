const faqs = [
  {
    question: 'What is clarifying-first?',
    answer:
      'Instead of guessing what you mean, Context asks 2–3 specific follow-up questions first, shows an “Understood” summary of your intent, and only then answers. You can confirm or correct it.',
  },
  {
    question: 'Do I need an OpenRouter key?',
    answer:
      'Yes. Context uses your own OpenRouter key so you can pick any supported model and control your own usage and costs. Paste it once during onboarding and you are ready to chat.',
  },
  {
    question: 'Where is my key stored?',
    answer:
      'Your key is stored with your account and sent only to OpenRouter to run your chats. It is never shared, sold, or displayed to anyone else.',
  },
  {
    question: 'Is it free?',
    answer:
      'Using Context itself is free. You only pay OpenRouter directly for the model usage tied to your own key — often just cents per conversation.',
  },
  {
    question: 'How is this different from ChatGPT?',
    answer:
      'Standard chatbots answer immediately and often guess wrong. Context is designed to detect ambiguity, ask targeted follow-ups, and confirm understanding before answering — so the first answer is the right one.',
  },
  {
    question: 'Can I delete my data?',
    answer:
      'Yes. Your chats are local-first and you can delete individual conversations or your full history at any time from within the app.',
  },
];

export default function FAQ() {
  return (
    <section id="faq" className="overflow-x-hidden border-t border-gray-200 bg-gray-50">
      <div className="mx-auto max-w-3xl scroll-mt-20 px-4 py-16 sm:px-6 sm:py-20">
        <div className="mb-8 text-center sm:mb-10">
          <h2 className="font-display text-section font-bold">Frequently asked questions</h2>
          <p className="mt-3 text-base text-gray-500">
            Everything you need to know before you start.
          </p>
        </div>
        <div className="space-y-3">
          {faqs.map((faq) => (
            <details
              key={faq.question}
              className="group rounded-lg border border-gray-200 bg-white px-4 py-2 shadow-sm sm:px-5"
            >
              <summary className="flex min-h-[44px] cursor-pointer list-none items-center py-2 text-base font-medium marker:text-gray-500">
                {faq.question}
              </summary>
              <p className="pb-3 text-sm leading-relaxed text-gray-500 sm:text-[15px]">
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
