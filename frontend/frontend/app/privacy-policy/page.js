'use client'

import Link from 'next/link'
import { useLanguage } from '@/context/LanguageContext'

export default function PrivacyPolicy() {
    const { language, t } = useLanguage()

    const content = {
        en: {
            title: 'Privacy Policy',
            lastUpdated: 'Last Updated: April 2026',
            sections: [
                {
                    title: '1. Introduction',
                    content: 'GoArtisans ("we", "us", "our") operates the GoArtisans platform. This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service and the choices you have associated with that data.'
                },
                {
                    title: '2. Information Collection and Use',
                    content: 'We collect several different types of information for various purposes to provide and improve our Service to you.\n\nTypes of Data Collected:\n• Personal Data: Including but not limited to email address, name, phone number, postal address, and profile information\n• Usage Data: Including browser type, IP address, pages visited, time spent on pages, and other diagnostic data\n• Device Data: Device type, operating system, unique device identifiers, and mobile network information'
                },
                {
                    title: '3. Use of Data',
                    content: 'GoArtisans uses the collected data for various purposes:\n• To provide and maintain our Service\n• To notify you about changes to our Service\n• To allow you to participate in interactive features of our Service\n• To provide customer support and respond to inquiries\n• To gather analysis or valuable information so that we can improve our Service\n• To monitor the usage of our Service\n• To detect, prevent and address technical issues and fraudulent activity'
                },
                {
                    title: '4. Security of Data',
                    content: 'The security of your data is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure. While we strive to use commercially acceptable means to protect your Personal Data, we cannot guarantee its absolute security.'
                },
                {
                    title: '5. Changes to This Privacy Policy',
                    content: 'We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date at the top of this Privacy Policy.'
                },
                {
                    title: '6. Contact Us',
                    content: 'If you have any questions about this Privacy Policy, please contact us at GoArtisans7@gmail.com or call us at 228 93495719.'
                }
            ]
        },
        fr: {
            title: 'Politique de Confidentialité',
            lastUpdated: 'Dernière mise à jour : Avril 2026',
            sections: [
                {
                    title: '1. Introduction',
                    content: 'GoArtisans ("nous", "nos") exploite la plateforme GoArtisans. Cette page vous informe de nos politiques concernant la collecte, l\'utilisation et la divulgation de données personnelles lorsque vous utilisez notre Service et les choix dont vous disposez concernant ces données.'
                },
                {
                    title: '2. Collecte et Utilisation des Informations',
                    content: 'Nous collectons plusieurs types d\'informations différentes à diverses fins pour vous fournir et améliorer notre Service.\n\nTypes de données collectées :\n• Données Personnelles : Y compris, mais sans s\'y limiter, l\'adresse e-mail, le nom, le numéro de téléphone, l\'adresse postale et les informations de profil\n• Données d\'Utilisation : Y compris le type de navigateur, l\'adresse IP, les pages visitées, le temps passé sur les pages et autres données de diagnostic\n• Données d\'Appareil : Type d\'appareil, système d\'exploitation, identifiants d\'appareil uniques et informations de réseau mobile'
                },
                {
                    title: '3. Utilisation des Données',
                    content: 'GoArtisans utilise les données collectées à diverses fins :\n• Fournir et maintenir notre Service\n• Vous notifier des modifications apportées à notre Service\n• Vous permettre de participer aux fonctionnalités interactives de notre Service\n• Fournir un support client et répondre aux demandes\n• Recueillir des analyses ou des informations précieuses pour améliorer notre Service\n• Surveiller l\'utilisation de notre Service\n• Détecter, prévenir et résoudre les problèmes techniques et les activités frauduleuses'
                },
                {
                    title: '4. Sécurité des Données',
                    content: 'La sécurité de vos données est importante pour nous, mais rappelez-vous qu\'aucune méthode de transmission sur Internet ou méthode de stockage électronique n\'est 100 % sécurisée. Bien que nous nous efforcions d\'utiliser des moyens commercialement acceptables pour protéger vos Données Personnelles, nous ne pouvons pas garantir sa sécurité absolue.'
                },
                {
                    title: '5. Modifications de cette Politique de Confidentialité',
                    content: 'Nous pouvons mettre à jour notre Politique de Confidentialité de temps en temps. Nous vous informerons de tout changement en publiant la nouvelle Politique de Confidentialité sur cette page et en mettant à jour la date de "Dernière mise à jour" en haut de cette Politique de Confidentialité.'
                },
                {
                    title: '6. Nous Contacter',
                    content: 'Si vous avez des questions concernant cette Politique de Confidentialité, veuillez nous contacter à GoArtisans7@gmail.com ou nous appeler au 228 93495719.'
                }
            ]
        }
    }

    const lang = language === 'fr' ? 'fr' : 'en'
    const data = content[lang]

    return (
        <>
            <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12 sm:py-20">
                    {/* Header */}
                    <div className="mb-12">
                        <Link href="/" className="inline-flex items-center gap-2 text-blue-700 hover:text-blue-800 transition mb-6">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                            </svg>
                            {language === 'fr' ? 'Retour' : 'Back'}
                        </Link>

                        <h1 className="text-4xl sm:text-5xl font-bold text-slate-900 mb-3">
                            {data.title}
                        </h1>
                        <p className="text-slate-600 text-sm sm:text-base">
                            {data.lastUpdated}
                        </p>
                    </div>

                    {/* Content */}
                    <div className="prose prose-slate max-w-none">
                        {data.sections.map((section, index) => (
                            <div key={index} className="mb-8">
                                <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-3">
                                    {section.title}
                                </h2>
                                <p className="text-slate-700 leading-relaxed whitespace-pre-wrap">
                                    {section.content}
                                </p>
                            </div>
                        ))}
                    </div>

                    {/* Footer Contact */}
                    <div className="mt-12 p-6 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-slate-700">
                            {language === 'fr'
                                ? 'Des questions ? Contactez-nous à GoArtisans7@gmail.com'
                                : 'Have questions? Contact us at GoArtisans7@gmail.com'
                            }
                        </p>
                    </div>
                </div>
            </div>
        </>
    )
}
