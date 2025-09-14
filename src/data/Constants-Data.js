// -- SOME DATAS THAT IS --
import Ionicons from '@expo/vector-icons/Ionicons';
import { MaterialCommunityIcons } from '@expo/vector-icons/MaterialCommunityIcons';
//About
export const COMPANY_NAME = 'FiBear Network Technologies Corp.';
export const VERSION = '4.0.56';
export const CEO_NAME = 'Prince Scoth E. Donato';
export const MISSION_POINTS = [
  "Continue to improve our services by seeking new ways, means and technology that will adapt to the changing needs of the clients.",
  "Create and cultivate long-term business relationships with clients and business partners.",
  "Provide the best customer service possible.",
  "Expand the company’s network by offering technology that is better than the existing competitors at a more affordable price."
];
export const VISION_POINTS = [
  "Become the leading affordable ICT service provider in the country.",
  "Become the one-stop shop of all Information and Technology needs of clients.",
  "Gain the confidence and trust of our clients and business partners in this businessfield.",
  "Employ, Train and Produce talents that will work collaboratively and productively with the company towards mutual growth and development."
];

//How to Use Screen

export const howToUseData = {
  en: [
    {
      title: 'Navigating the App',
      content: 'Use the bottom navigation bar to easily switch between Home, Plan, Support, and Profile. Each section is tailored to help you manage your account efficiently.',
      icon: 'compass-outline',
      tags: ['general', 'navigation'],
    },
    {
      title: 'Managing Your Subscription',
      content: 'Visit the "Plan" screen to see your active subscription details, view your next billing date, or apply for a new plan. You can also submit requests to upgrade, downgrade, or cancel your service directly from this screen.',
      icon: 'wifi-outline',
      tags: ['plan', 'subscription', 'billing'],
      navigateTo: 'Plan',
    },
    {
      title: 'Troubleshooting Connection',
      icon: 'build-outline',
      tags: ['help', 'internet', 'slow'],
      checklist: [
        { id: '1', text: 'Restart your Wi-Fi router by unplugging it for 30 seconds.' },
        { id: '2', text: 'Check that all cables are securely connected to the router.' },
        { id: '3', text: 'Move closer to the router to check for signal strength issues.' },
        { id: '4', text: 'If the issue persists, create a support ticket.' },
      ],
      navigateTo: 'Support',
    },
    {
      title: 'Getting Help & Support',
      content: 'Our Support team is here to help. For urgent issues, call our 24/7 hotline at 0945 220 3371. For other concerns, email us at rparreno@fibearnetwork.com or create a ticket in the app.',
      icon: 'headset-outline',
      tags: ['support', 'help', 'ticket', 'chat'],
      navigateTo: 'Support',
      isCopyable: true,
    },
    {
      title: 'Updating Your Profile',
      content: 'Keep your information current in the "Profile" screen. You can change your display name and profile picture. Most importantly, ensure your installation address and mobile number are always up-to-date for uninterrupted service.',
      icon: 'person-circle-outline',
      tags: ['profile', 'account', 'address'],
      navigateTo: 'Profile',
    },
    {
      title: 'Pro Tip: Checking for Outages',
      content: 'Before troubleshooting, check our official Facebook Page for any service interruption announcements in your area. You can find the link in the Support screen.',
      icon: 'megaphone-outline',
      tags: ['pro-tip', 'outage', 'facebook'],
      navigateTo: 'Support',
    },
  ],
  tl: [
    // ... Tagalog translations ...
    {
      title: 'Pag-navigate sa App',
      content: 'Gamitin ang navigation bar sa ibaba para madaling lumipat sa pagitan ng Home, Plan, Support, at Profile. Ang bawat seksyon ay idinisenyo para tulungan kang pamahalaan ang iyong account nang mahusay.',
      icon: 'compass-outline',
      tags: ['pangkalahatan', 'nabigasyon'],
    },
    {
      title: 'Pamamahala ng Subscription',
      content: 'Bisitahin ang "Plan" screen para makita ang detalye ng iyong aktibong subscription, tingnan ang susunod na petsa ng iyong bill, o mag-apply para sa bagong plano. Maaari ka ring mag-request ng upgrade, downgrade, o kanselasyon ng serbisyo dito.',
      icon: 'wifi-outline',
      tags: ['plano', 'subscription', 'billing'],
      navigateTo: 'Plan',
    },
    {
      title: 'Pag-troubleshoot ng Koneksyon',
      icon: 'build-outline',
      tags: ['tulong', 'internet', 'mabagal'],
      checklist: [
        { id: '1', text: 'I-restart ang iyong Wi-Fi router sa pamamagitan ng pagbunot nito sa saksakan sa loob ng 30 segundo.' },
        { id: '2', text: 'Suriin kung lahat ng kable ay mahigpit na nakakonekta sa router.' },
        { id: '3', text: 'Lumapit sa router upang suriin kung may problema sa lakas ng signal.' },
        { id: '4', text: 'Kung magpapatuloy ang isyu, gumawa ng support ticket.' },
      ],
      navigateTo: 'Support',
    },
    {
      title: 'Paghahanap ng Tulong at Suporta',
      content: 'Narito ang aming Support team para tumulong. Para sa mga agarang isyu, tawagan ang aming 24/7 hotline sa 0945 220 3371. Para sa iba pang alalahanin, mag-email sa amin sa rparreno@fibearnetwork.com o gumawa ng ticket sa app.',
      icon: 'headset-outline',
      tags: ['suporta', 'tulong', 'ticket', 'chat'],
      navigateTo: 'Support',
      isCopyable: true,
    },
    {
      title: 'Pag-update ng Iyong Profile',
      content: 'Panatilihing updated ang iyong impormasyon sa "Profile" screen. Maaari mong palitan ang iyong display name at profile picture. Pinakaimportante, siguraduhing laging tama ang iyong installation address at mobile number.',
      icon: 'person-circle-outline',
      tags: ['profile', 'account', 'address'],
      navigateTo: 'Profile',
    },
    {
      title: 'Pro Tip: Pagsuri ng Outages',
      content: 'Bago mag-troubleshoot, suriin muna ang aming opisyal na Facebook Page para sa anumang anunsyo ng service interruption sa inyong lugar. Mahahanap ang link sa Support screen.',
      icon: 'megaphone-outline',
      tags: ['pro-tip', 'outage', 'facebook'],
      navigateTo: 'Support',
    },
  ],
};


//support screen

export const CONTACT_INFO = {
  phone: '+63 945 220 3371',
  email: 'rparreno@fibearnetwork.com',
  facebook: 'https://www.facebook.com/FiBearNetworkTechnologiesCorpMontalban',
};

//Feedbacks

export const MAX_CHARACTERS = 500;
export const RATING_DESCRIPTIONS = {
  0: { title: 'How was your experience?', subtitle: 'Your feedback helps us improve.' },
  1: { title: 'Oh no! What went wrong?', subtitle: "We're sorry to hear that." },
  2: { title: 'Room for improvement?', subtitle: 'We appreciate your feedback.' },
  3: { title: 'Getting better!', subtitle: 'What can we do to make it great?' },
  4: { title: 'Glad you liked it!', subtitle: 'Thanks for the positive feedback!' },
  5: { title: 'Awesome! We love to hear it!', subtitle: 'Thank you for being a valued customer!' },
};
export const POSITIVE_TAGS = ['Fast Speed', 'Reliable Connection', 'Good Customer Service', 'Affordable Price', 'Easy App'];
export const NEGATIVE_TAGS = ['Slow Speed', 'Connection Drops', 'Billing Issue', 'Poor Support', 'App is Confusing'];

//Change Password Screen
export const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]).{8,}$/;
export const REQUIREMENTS = [
    { id: 'length', text: 'At least 8 characters', regex: /.{8,}/ },
    { id: 'uppercase', text: 'An uppercase letter', regex: /[A-Z]/ },
    { id: 'number', text: 'A number', regex: /\d/ },
    { id: 'special', text: 'A special character', regex: /[!@#$%^&*()_+{}\[\]:;<>,.?~\\/-]/ },
];

//GET STARTED
export const SUBTITLE_TEXT = 'We are committed to keeping you connected. We provide fast, reliable, and stable internet service designed to meet your daily needs.';

//MYBILL SCREEN

export const ICONS = {
    bill_due: { component: Ionicons, name: 'alert-circle', colorKey: 'warning' },
    bill_overdue: { component: Ionicons, name: 'close-circle', colorKey: 'danger' },
    bill_paid: { component: Ionicons, name: 'checkmark-circle', colorKey: 'success' },
    bill_pending: { component: Ionicons, name: 'hourglass', colorKey: 'warning' },
    subscribed: { component: MaterialCommunityIcons, name: 'rocket-launch', colorKey: 'accent' },
    cancelled: { component: MaterialCommunityIcons, name: 'close-circle-outline', colorKey: 'danger' },
    payment_success: { component: MaterialCommunityIcons, name: 'check-decagram', colorKey: 'primary' },
    submitted_payment: { component: MaterialCommunityIcons, name: 'file-upload', colorKey: 'accent' },
    activated: { component: MaterialCommunityIcons, name: 'flash', colorKey: 'accent' },
    plan_change_requested: { component: Ionicons, name: 'swap-horizontal', colorKey: 'accent' },
    plan_change_cancelled: { component: Ionicons, name: 'arrow-undo-circle', colorKey: 'textSecondary' },
};


//PAY BILLS

export const EMPTY_STATES_CONFIG = (theme, navigation) => ({
  pending_installation: { icon: 'build-outline', color: theme.warning, title: 'Awaiting Installation', text: 'Your bills will appear here once your modem installation is complete.' },
  pending_verification: { icon: 'hourglass-outline', color: theme.warning, title: 'Verification in Progress', text: 'Your first bill will appear here once your plan is active. Pull down to refresh.' },
  pending_change: { icon: 'swap-horizontal-outline', color: theme.accent, title: 'Plan Change in Progress', text: 'You cannot pay bills while your plan change is being reviewed.', buttonText: 'View Status', action: () => navigation.navigate('Subscription') },
  declined: { icon: 'close-circle-outline', color: theme.danger, title: 'Submission Declined', text: 'Your subscription payment was not approved. Please check your subscription details.', buttonText: 'View Status & Retry', action: () => navigation.navigate('Subscription') },
  cancelled: { icon: 'close-circle-outline', color: theme.disabled, title: 'Subscription Cancelled', text: 'There are no outstanding bills to be paid.', buttonText: 'View Account Status', action: () => navigation.navigate('Subscription') },
  null: { icon: 'document-text-outline', color: theme.disabled, title: 'No Active Plan', text: 'You need an active subscription to pay bills.', buttonText: 'Subscribe Now', action: () => navigation.navigate('Subscription') },
  suspended: { icon: 'warning-outline', color: theme.danger, title: 'Account Suspended', text: 'Your account is suspended. Paying your overdue bill will reactivate your service.', buttonText: 'VIEW MY BILLS', action: () => navigation.navigate('MyBills') },
  active: { icon: 'checkmark-done-circle-outline', color: theme.success, title: 'All Paid Up!', text: 'You have no outstanding bills. Great job!' },
});