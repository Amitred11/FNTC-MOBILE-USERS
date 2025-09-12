// screens/HowToUseScreen.js
import React, { useState, useEffect } from 'react';
import { 
    View, Text, StyleSheet, ScrollView, SafeAreaView, 
    TouchableOpacity, LayoutAnimation, Platform, UIManager, Animated, Share, Clipboard
} from 'react-native';
import { useTheme } from '../../contexts/ThemeContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const howToUseData = {
  en: [
    // ... existing data ...
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

const HowToUseItem = ({ item, isExpanded, onToggle }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const navigation = useNavigation();
    const [isOpen, setIsOpen] = useState(isExpanded);
    const [checkedItems, setCheckedItems] = useState({});
    const [copied, setCopied] = useState(false);
    const rotation = React.useRef(new Animated.Value(isExpanded ? 1 : 0)).current;

    useEffect(() => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsOpen(isExpanded);
        Animated.timing(rotation, {
            toValue: isExpanded ? 1 : 0,
            duration: 300,
            useNativeDriver: true,
        }).start();
    }, [isExpanded]);

    const handleToggle = () => onToggle();

    const handleCheckItem = (id) => {
        setCheckedItems(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const handleCopy = () => {
        Clipboard.setString(item.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    };

    const handleShare = async () => {
        try {
            await Share.share({
                message: `${item.title}\n\n${item.content || "Check the app for more details."}`,
            });
        } catch (error) {
            console.error(error.message);
        }
    };

    const rotateIcon = rotation.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '90deg'] });

    return (
        <Animatable.View animation="fadeInUp" duration={500}>
            <View style={styles.itemContainer}>
                <TouchableOpacity style={styles.itemHeader} onPress={handleToggle} activeOpacity={0.8}>
                    <View style={styles.iconContainer}><Ionicons name={item.icon} size={24} color={theme.primary} /></View>
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Animated.View style={{ transform: [{ rotate: rotateIcon }] }}><Ionicons name={"chevron-forward"} size={22} color={theme.textSecondary} /></Animated.View>
                </TouchableOpacity>
                {isOpen && (
                    <Animatable.View animation="fadeIn" duration={400} style={styles.itemBody}>
                        {item.checklist ? (
                            item.checklist.map((checkItem, index) => (
                                <TouchableOpacity key={checkItem.id} style={styles.checklistItem} onPress={() => handleCheckItem(checkItem.id)}>
                                    <View style={[styles.checkbox, checkedItems[checkItem.id] && styles.checkboxChecked]}>
                                        {checkedItems[checkItem.id] && <Ionicons name="checkmark" size={14} color={theme.textOnPrimary} />}
                                    </View>
                                    <Text style={[styles.checklistItemText, checkedItems[checkItem.id] && styles.checklistItemTextChecked]}>{checkItem.text}</Text>
                                </TouchableOpacity>
                            ))
                        ) : (
                            <Text style={styles.itemContent}>{item.content}</Text>
                        )}
                        <View style={styles.itemActions}>
                            {item.navigateTo && (
                                <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate(item.navigateTo)}>
                                    <Text style={styles.actionButtonText}>Go to Section</Text>
                                </TouchableOpacity>
                            )}
                            {item.isCopyable && (
                                <TouchableOpacity style={styles.actionIcon} onPress={handleCopy}>
                                    <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={22} color={theme.primary} />
                                </TouchableOpacity>
                            )}
                            <TouchableOpacity style={styles.actionIcon} onPress={handleShare}>
                                <Ionicons name="share-social-outline" size={22} color={theme.primary} />
                            </TouchableOpacity>
                        </View>
                    </Animatable.View>
                )}
            </View>
        </Animatable.View>
    );
};

export default function HowToUseScreen() {
  const { theme } = useTheme();
  const { language, setLanguage } = useLanguage(); 
  const navigation = useNavigation();
  const styles = getStyles(theme);
  const [expandedItems, setExpandedItems] = useState({});

  const data = howToUseData[language] || howToUseData['en'];

  const handleToggleItem = (index) => {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      setExpandedItems(prev => ({ ...prev, [index]: !prev[index] }));
  };

  const handleExpandAll = () => {
      const allExpanded = data.reduce((acc, _, index) => ({ ...acc, [index]: true }), {});
      setExpandedItems(allExpanded);
  };
  
  const handleCollapseAll = () => setExpandedItems({});

  const screenText = { en: { header: 'How to Use This App', subtitle: 'Find answers and learn how to manage your account with these guides.' }, tl: { header: 'Paano Gamitin ang App', subtitle: 'Maghanap ng mga sagot at alamin kung paano pamahalaan ang iyong account gamit ang mga gabay na ito.' } }
  const currentText = screenText[language] || screenText['en'];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}><Ionicons name="arrow-back" size={26} color={theme.text} /></TouchableOpacity>
        <Text style={styles.headerTitle}>{currentText.header}</Text>
        <TouchableOpacity onPress={() => setLanguage(language === 'en' ? 'tl' : 'en')} style={styles.headerButton}><Ionicons name="language-outline" size={26} color={theme.text} /></TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.introContainer}><Text style={styles.screenSubtitle}>{currentText.subtitle}</Text></View>
        <View style={styles.controlsContainer}>
            <TouchableOpacity onPress={handleExpandAll} style={styles.controlButton}><Text style={styles.controlButtonText}>Expand All</Text></TouchableOpacity>
            <TouchableOpacity onPress={handleCollapseAll} style={styles.controlButton}><Text style={styles.controlButtonText}>Collapse All</Text></TouchableOpacity>
        </View>
        {data.map((item, index) => (
            <HowToUseItem key={index} item={item} isExpanded={!!expandedItems[index]} onToggle={() => handleToggleItem(index)} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, height: 60, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
  headerButton: { padding: 5, minWidth: 40, alignItems: 'center' },
  headerTitle: { color: theme.text, fontSize: 20, fontWeight: 'bold' },
  scrollContainer: { paddingVertical: 24, paddingHorizontal: 20 },
  introContainer: { alignItems: 'center', marginBottom: 16 },
  screenSubtitle: { fontSize: 16, color: theme.textSecondary, textAlign: 'center', lineHeight: 24 },
  controlsContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 20, gap: 15 },
  controlButtonText: { color: theme.primary, fontSize: 15, fontWeight: '600' },
  itemContainer: { backgroundColor: theme.surface, borderRadius: 16, marginBottom: 16, borderWidth: 1, borderColor: theme.border, overflow: 'hidden' },
  itemHeader: { flexDirection: 'row', alignItems: 'center', padding: 20 },
  iconContainer: { width: 44, height: 44, borderRadius: 22, backgroundColor: `${theme.primary}1A`, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  itemTitle: { flex: 1, fontSize: 17, fontWeight: '600', color: theme.text },
  itemBody: { paddingHorizontal: 20, paddingBottom: 20, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16 },
  itemContent: { fontSize: 15, color: theme.textSecondary, lineHeight: 23, marginBottom: 16 },
  checklistItem: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  checkbox: { width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: theme.primary, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  checkboxChecked: { backgroundColor: theme.primary, borderColor: theme.primary },
  checklistItemText: { flex: 1, fontSize: 15, color: theme.textSecondary },
  checklistItemTextChecked: { textDecorationLine: 'line-through', color: theme.disabled },
  itemActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16, marginTop: 8 },
  actionButton: { flexDirection: 'row', alignItems: 'center', backgroundColor: `${theme.primary}1A`, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, marginRight: 'auto' },
  actionButtonText: { color: theme.primary, fontSize: 14, fontWeight: 'bold', marginRight: 6 },
  actionIcon: { padding: 8, marginLeft: 8 },
});