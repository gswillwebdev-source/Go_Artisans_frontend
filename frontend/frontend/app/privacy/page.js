'use client'

import Link from 'next/link'

export default function PrivacyPolicy() {
    return (
        <main className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-sm border border-slate-100 p-8 sm:p-12">
                <div className="mb-8">
                    <Link href="/" className="text-blue-600 hover:text-blue-700 text-sm font-medium transition">
                        ← Back to Home
                    </Link>
                </div>

                <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 mb-3">Privacy Policy</h1>
                <p className="text-slate-500 text-sm mb-10">Last updated: April 2026</p>

                <div className="prose prose-slate max-w-none space-y-8">

                    <section>
                        <h2 className="text-xl font-semibold text-slate-800 mb-3">1. Introduction</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Welcome to GoArtisans. We are committed to protecting your personal information and your right to privacy.
                            This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our platform,
                            including our website, mobile applications, and related services (collectively, the &quot;Service&quot;).
                            Please read this policy carefully. If you disagree with its terms, please discontinue use of the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-800 mb-3">2. Information We Collect</h2>
                        <p className="text-slate-600 leading-relaxed mb-3">We collect information you provide directly to us, including:</p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
                            <li><strong>Personal information:</strong> name, email address, phone number, and profile photo</li>
                            <li><strong>Professional information:</strong> skills, work experience, job history, and credentials</li>
                            <li><strong>Payment information:</strong> billing details for premium services (processed by third-party providers)</li>
                            <li><strong>Device information:</strong> IP address, browser type, operating system</li>
                            <li><strong>Usage data:</strong> pages visited, features used, interactions with listings</li>
                            <li><strong>Location data:</strong> general location when you use location-based features</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-800 mb-3">3. How We Use Your Information</h2>
                        <p className="text-slate-600 leading-relaxed mb-3">We use the information we collect to:</p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
                            <li>Create and manage your account</li>
                            <li>Connect workers with clients and process job requests</li>
                            <li>Send notifications about jobs, applications, and platform updates</li>
                            <li>Respond to your inquiries and provide customer support</li>
                            <li>Improve our platform and develop new features</li>
                            <li>Comply with legal obligations</li>
                            <li>Detect and prevent fraud or abuse</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-800 mb-3">4. Sharing of Information</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We do not sell your personal information. We may share your information with:
                        </p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2 mt-3">
                            <li><strong>Other users:</strong> profile information visible to clients or workers as necessary for the Service</li>
                            <li><strong>Service providers:</strong> third parties that help us operate the platform (e.g., cloud hosting, email delivery, analytics)</li>
                            <li><strong>Legal authorities:</strong> when required by law, court order, or to protect our rights</li>
                            <li><strong>Business transfers:</strong> in connection with a merger, acquisition, or sale of assets</li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-800 mb-3">5. Security of Your Information</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We use industry-standard security measures including encryption and secure servers to protect your personal information.
                            However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security,
                            and you use the Service at your own risk.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-800 mb-3">6. Data Retention</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We retain your personal information for as long as your account is active or as needed to provide the Service.
                            You may request deletion of your account and associated data by contacting us at the email address below.
                            We may retain certain information as required by law or for legitimate business purposes.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-800 mb-3">7. Cookies and Tracking</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We use cookies and similar tracking technologies to enhance your experience, analyze usage patterns, and deliver
                            relevant content. You can control cookies through your browser settings, though disabling them may affect
                            some features of the Service.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-800 mb-3">8. Third-Party Links</h2>
                        <p className="text-slate-600 leading-relaxed">
                            Our Service may contain links to third-party websites. We are not responsible for the privacy practices
                            of those websites and encourage you to review their privacy policies before providing any information.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-800 mb-3">9. Your Rights and Choices</h2>
                        <p className="text-slate-600 leading-relaxed mb-3">Depending on your location, you may have the right to:</p>
                        <ul className="list-disc list-inside text-slate-600 space-y-2 ml-2">
                            <li>Access and obtain a copy of your personal data</li>
                            <li>Correct inaccurate or incomplete information</li>
                            <li>Request deletion of your personal data</li>
                            <li>Opt out of marketing communications</li>
                            <li>Request data portability</li>
                        </ul>
                        <p className="text-slate-600 leading-relaxed mt-3">
                            To exercise any of these rights, please contact us using the information below.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-800 mb-3">10. Changes to This Policy</h2>
                        <p className="text-slate-600 leading-relaxed">
                            We may update this Privacy Policy from time to time. We will notify you of any material changes by posting
                            the new policy on this page and updating the &quot;Last updated&quot; date. Your continued use of the Service
                            after changes constitutes your acceptance of the revised policy.
                        </p>
                    </section>

                    <section>
                        <h2 className="text-xl font-semibold text-slate-800 mb-3">11. Contact Us</h2>
                        <p className="text-slate-600 leading-relaxed">
                            If you have any questions about this Privacy Policy or our data practices, please contact us at:
                        </p>
                        <div className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-100">
                            <p className="text-slate-700 font-medium">GoArtisans</p>
                            <p className="text-slate-600 text-sm mt-1">Email: <a href="mailto:GoArtisans7@gmail.com" className="text-blue-600 hover:underline">GoArtisans7@gmail.com</a></p>
                            <p className="text-slate-600 text-sm">Phone: 228 93495719</p>
                            <p className="text-slate-600 text-sm">Location: Assigame, en face d&apos;Ecobank</p>
                        </div>
                    </section>

                </div>
            </div>
        </main>
    )
}
