// screens/HowToUseScreen.js
import React from 'react';
import { 
    View, Text, StyleSheet, ScrollView, SafeAreaView, 
    TouchableOpacity, LayoutAnimation, Platform, UIManager 
} from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { useLanguage } from '../contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import * as Animatable from 'react-native-animatable';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const howToUseData = {
  en: [
    {
      title: 'Navigating the App',
      content: 'Use the bottom navigation bar to switch between the Home, Plan, Support, and Profile screens. Each screen is designed for a specific purpose.',
      icon: 'compass-outline'
    },
    {
      title: 'Managing Your Subscription',
      content: 'Go to the "Plan" screen to view your active subscription, check your billing cycle, or start a new application if you don\'t have one. You can also request to change or cancel your plan from here.',
      icon: 'wifi'
    },
    {
      title: 'Getting Help',
      content: 'The "Support" screen is your central hub for help. You can chat with our 24/7 AI for instant answers, connect with a live agent, or create a support ticket for specific issues like billing or technical problems.',
      icon: 'headset-outline'
    },
    {
      title: 'Creating a Support Ticket',
      content: 'To create a ticket, go to Support > My Support Tickets > Create New Ticket. Please select the correct category and provide as much detail as possible, including screenshots if helpful. This helps us resolve your issue faster.',
      icon: 'document-text-outline'
    },
    {
      title: 'Updating Your Profile',
      content: 'Keep your information up-to-date in the "Profile" screen. You can change your display name, profile picture, and most importantly, your installation address and mobile number.',
      icon: 'person-circle-outline'
    },
  ],
  tl: [
    {
      title: 'Pag-navigate sa App',
      content: 'Gamitin ang navigation bar sa ibaba para lumipat sa pagitan ng Home, Plan, Support, at Profile. Ang bawat screen ay may partikular na layunin.',
      icon: 'compass-outline'
    },
    {
      title: 'Pamamahala ng Iyong Subscription',
      content: 'Pumunta sa "Plan" screen para tingnan ang iyong aktibong subscription, suriin ang iyong billing cycle, o magsimula ng bagong aplikasyon. Maaari ka ring humiling na baguhin o kanselahin ang iyong plano dito.',
      icon: 'wifi'
    },
    {
        title: 'Paghahanap ng Tulong',
        content: 'Ang "Support" screen ang iyong sentro para sa tulong. Maaari kang makipag-chat sa aming 24/7 AI para sa mabilis na sagot, kumonekta sa isang live agent, o gumawa ng support ticket para sa mga isyu.',
        icon: 'headset-outline'
    },
    {
        title: 'Paggawa ng Support Ticket',
        content: 'Para gumawa ng ticket, pumunta sa Support > My Support Tickets > Create New Ticket. Piliin ang tamang kategorya at magbigay ng sapat na detalye, kasama ang mga screenshot kung kinakailangan.',
        icon: 'document-text-outline'
    },
    {
        title: 'Pag-update ng Iyong Profile',
        content: 'Panatilihing updated ang iyong impormasyon sa "Profile" screen. Maaari mong palitan ang iyong display name, profile picture, at higit sa lahat, ang iyong installation address at mobile number.',
        icon: 'person-circle-outline'
    },
  ]
};

const HowToUseItem = ({ item, index }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [isOpen, setIsOpen] = React.useState(false);

    const toggleOpen = () => {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
        setIsOpen(!isOpen);
    };

    return (
        <Animatable.View animation="fadeInUp" duration={500} delay={index * 100}>
            <TouchableOpacity style={styles.itemContainer} onPress={toggleOpen} activeOpacity={0.8}>
                <View style={styles.itemHeader}>
                    <Ionicons name={item.icon} size={24} color={theme.primary} style={styles.itemIcon} />
                    <Text style={styles.itemTitle}>{item.title}</Text>
                    <Ionicons name={isOpen ? "chevron-down" : "chevron-forward"} size={22} color={theme.textSecondary} />
                </View>
                {isOpen && (
                    <Animatable.View animation="fadeIn" duration={400} style={styles.itemBody}>
                        <Text style={styles.itemContent}>{item.content}</Text>
                    </Animatable.View>
                )}
            </TouchableOpacity>
        </Animatable.View>
    );
};

export default function HowToUseScreen({ navigation }) {
  const { theme } = useTheme();
  // We now get setLanguage to change the language
  const { language, setLanguage } = useLanguage(); 
  const styles = getStyles(theme);

  const data = howToUseData[language] || howToUseData['en'];
  
  const screenText = {
      en: {
          header: 'How to Use This App',
          subtitle: 'Welcome! Here are some tips to help you get the most out of our app. Tap any section to learn more.'
      },
      tl: {
          header: 'Paano Gamitin ang App',
          subtitle: 'Maligayang pagdating! Narito ang ilang mga tip para masulit mo ang aming app. I-tap ang bawat seksyon para matuto pa.'
      }
  }
  const currentText = screenText[language] || screenText['en'];

  const handleToggleLanguage = () => {
      const nextLanguage = language === 'en' ? 'tl' : 'en';
      setLanguage(nextLanguage);
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerButton}>
          <Ionicons name="arrow-back" size={26} color={theme.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentText.header}</Text>
        <TouchableOpacity onPress={handleToggleLanguage} style={styles.headerButton}>
            <Text style={styles.languageToggleText}>
                {language === 'en' ? 'TAGALOG' : 'ENGLISH'}
            </Text>
        </TouchableOpacity>
      </View>
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <Text style={styles.screenSubtitle}>
            {currentText.subtitle}
        </Text>
        {data.map((item, index) => (
          <HowToUseItem key={index} item={item} index={index} />
        ))}
      </ScrollView>
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 60,
    backgroundColor: theme.surface,
    borderBottomWidth: 1,
    borderBottomColor: theme.border,
  },
  headerButton: {
    padding: 5,
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  languageToggleText: {
    color: theme.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  headerTitle: {
    color: theme.text,
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollContainer: {
    padding: 20,
  },
  screenSubtitle: {
    fontSize: 16,
    color: theme.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  itemContainer: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: theme.border,
    overflow: 'hidden',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
  },
  itemIcon: {
    marginRight: 15,
  },
  itemTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  itemBody: {
    paddingHorizontal: 20,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: theme.border,
    paddingTop: 20,
    marginLeft: 20,
  },
  itemContent: {
    fontSize: 15,
    color: theme.textSecondary,
    lineHeight: 22,
  },
});