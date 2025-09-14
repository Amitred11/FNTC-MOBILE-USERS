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
import { howToUseData } from '../../data/Constants-Data';

if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

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