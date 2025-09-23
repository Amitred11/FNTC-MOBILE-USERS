// screens/CustomerFeedbackScreen.js (Visually Stunning Refactor)

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Image,
  Animated,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useTheme, useAlert } from '../../contexts';
import { BlurView } from 'expo-blur'; // For Glassmorphism effect

// --- SUB-COMPONENTS ---

const FeedbackCard = React.memo(({ item, profile, onEdit, onDelete, index }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isMenuVisible, setMenuVisible] = useState(false);

    const photoUrl = item.userId?.photoUrl;
    const displayName = item.userId?.displayName || 'Anonymous';
    const isOwner = profile?._id === item.userId?._id;

    // Memoized parsing of feedback text to extract tags
    const { mainText, tags } = useMemo(() => {
        const tagMarker = '\n\n[Tags]: ';
        const tagIndex = item.text.indexOf(tagMarker);
        if (tagIndex !== -1) {
            return {
                mainText: item.text.substring(0, tagIndex),
                tags: item.text.substring(tagIndex + tagMarker.length).split(', ').filter(Boolean),
            };
        }
        return { mainText: item.text, tags: [] };
    }, [item.text]);
    
    const isLongFeedback = mainText.length > 120;
    const toggleExpand = () => setIsExpanded(prev => !prev);
    const toggleMenu = () => setMenuVisible(prev => !prev);

    return (
        <Animatable.View animation="fadeInUp" duration={500} delay={index * 100} style={styles.card}>
            <View style={styles.cardHeader}>
                <Image style={styles.avatar} source={photoUrl ? { uri: photoUrl } : require('../../assets/images/avatars/profilepic.jpg')} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{displayName}</Text>
                    <View style={styles.stars}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Ionicons key={i} name={i < item.rating ? 'star' : 'star-outline'} size={18} color="#FFC107" />
                        ))}
                    </View>
                </View>
                {isOwner && (
                    <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
                        <Ionicons name="ellipsis-vertical" size={22} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {isMenuVisible && (
                <Animatable.View animation="fadeIn" duration={200} style={styles.popoverMenu}>
                    <TouchableOpacity style={styles.popoverItem} onPress={() => { onEdit(item); toggleMenu(); }}>
                        <Ionicons name="create-outline" size={20} color={theme.text} /><Text style={styles.popoverText}>Edit</Text>
                    </TouchableOpacity>
                    <View style={styles.popoverDivider} />
                    <TouchableOpacity style={styles.popoverItem} onPress={() => { onDelete(item._id); toggleMenu(); }}>
                        <Ionicons name="trash-outline" size={20} color={theme.danger} /><Text style={[styles.popoverText, { color: theme.danger }]}>Delete</Text>
                    </TouchableOpacity>
                </Animatable.View>
            )}
            
            <Text style={styles.feedback} numberOfLines={isExpanded ? undefined : 3}>{mainText}</Text>

            {isLongFeedback && (
                <TouchableOpacity onPress={toggleExpand} style={styles.seeMoreButton}>
                    <Text style={styles.seeMoreText}>{isExpanded ? 'Show Less' : 'Show More'}</Text>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={theme.primary} />
                </TouchableOpacity>
            )}

            {tags.length > 0 && (
                <View style={styles.tagsContainer}>
                    {tags.map(tag => <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>)}
                </View>
            )}
        </Animatable.View>
    );
});

const EmptyState = React.memo(({ icon, title, subtitle, buttonText, onButtonPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <Animatable.View animation="fadeInUp" style={styles.emptyContainer}>
            <Ionicons name={icon} size={60} color={theme.disabled} style={{ opacity: 0.5 }} />
            <Text style={styles.emptyText}>{title}</Text>
            <Text style={styles.emptySubtext}>{subtitle}</Text>
            {buttonText && onButtonPress && (
                 <TouchableOpacity style={styles.emptyButton} onPress={onButtonPress}>
                    <Ionicons name="add-circle-outline" size={20} color={theme.textOnPrimary} />
                    <Text style={styles.emptyButtonText}>{buttonText}</Text>
                </TouchableOpacity>
            )}
        </Animatable.View>
    );
});

// --- Main List Screen Component ---
export default function CustomerFeedbackScreen() {
  const navigation = useNavigation();
  const { theme } = useTheme();
  const { api, user: profile } = useAuth();
  const { showAlert } = useAlert();
  const styles = getStyles(theme);

  const [allFeedbacks, setAllFeedbacks] = useState([]);
  const [filteredFeedbacks, setFilteredFeedbacks] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('All');
  
  const scrollY = useRef(new Animated.Value(0)).current;

  const fetchFeedbacks = useCallback(async () => {
    try {
      const { data } = await api.get('/feedback');
      setAllFeedbacks(data.data.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)) || []);
    } catch (error) {
      showAlert('Error', 'Could not fetch customer feedback.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [api, showAlert]);

  useFocusEffect(useCallback(() => { fetchFeedbacks(); }, [fetchFeedbacks]));

  useEffect(() => {
    if (!profile) return;
    let filtered = [];
    if (activeTab === 'My Feedback') {
        filtered = allFeedbacks.filter(item => item.userId?._id === profile._id);
    } else if (activeTab === 'Community') {
        filtered = allFeedbacks.filter(item => item.userId?._id !== profile._id);
    } else {
        filtered = allFeedbacks;
    }
    setFilteredFeedbacks(filtered);
  }, [activeTab, allFeedbacks, profile]);

  const onRefresh = () => { setIsRefreshing(true); fetchFeedbacks(); };

  const handleDelete = useCallback((feedbackId) => {
    showAlert('Delete Feedback', 'Are you sure you want to permanently delete this feedback?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
          try {
            await api.delete(`/feedback/${feedbackId}`);
            setAllFeedbacks(prev => prev.filter(f => f._id !== feedbackId));
          } catch (error) {
            showAlert('Error', 'Failed to delete feedback.');
          }
      }},
    ]);
  }, [api, showAlert]);

  const handleEdit = useCallback((feedbackItem) => {
    navigation.navigate('FeedbackFormScreen', { feedbackItem });
  }, [navigation]);

  const renderEmptyState = useMemo(() => {
    if (isLoading) return null;
    if (activeTab === 'My Feedback' && filteredFeedbacks.length === 0) {
        return <EmptyState icon="chatbox-ellipses-outline" title="No Feedback From You" subtitle="Share your experience to help us improve." buttonText="Leave Feedback" onButtonPress={() => navigation.navigate('FeedbackFormScreen')} />;
    }
    if (filteredFeedbacks.length === 0) {
        return <EmptyState icon="chatbubbles-outline" title="No Feedback Yet" subtitle="It's quiet in here... be the first to share your thoughts!" />;
    }
    return null;
  }, [isLoading, activeTab, filteredFeedbacks.length, navigation]);

  const averageRating = useMemo(() => {
      if(allFeedbacks.length === 0) return 0;
      const total = allFeedbacks.reduce((acc, curr) => acc + curr.rating, 0);
      return (total / allFeedbacks.length).toFixed(1);
  }, [allFeedbacks]);

  // Animation values for the immersive header
  const headerHeight = scrollY.interpolate({ inputRange: [0, 60], outputRange: [200, 90], extrapolate: 'clamp' });
  const headerOpacity = scrollY.interpolate({ inputRange: [0, 100], outputRange: [1, 0], extrapolate: 'clamp' });
  const titleTranslateY = scrollY.interpolate({ inputRange: [0, 150], outputRange: [0, -20], extrapolate: 'clamp' });
  const titleScale = scrollY.interpolate({ inputRange: [0, 150], outputRange: [1, 0.8], extrapolate: 'clamp' });

  const compactHeaderOpacity = scrollY.interpolate({
      inputRange: [75, 120], // Fades in as the main content fades out
      outputRange: [0, 1],
      extrapolate: 'clamp',
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Immersive Animated Header */}
      <Animated.View style={[styles.header, { height: headerHeight }]}>
        <LinearGradient colors={theme.isDarkMode ? ['#3A506B', '#1C2541'] : [theme.primary, theme.accent]} style={StyleSheet.absoluteFill} />
        <BlurView intensity={10} tint={theme.isDarkMode ? 'dark' : 'light'} style={styles.headerBlur}>
            <View style={styles.headerBar}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}><Ionicons name="arrow-back" size={26} color="#FFF" /></TouchableOpacity>
                <Animated.Text style={[styles.headerTitleCompact, { opacity: compactHeaderOpacity }]}>
                    Customer Feedback
                </Animated.Text>
            </View>
            <Animated.View style={[styles.headerContent, { opacity: headerOpacity, transform: [{ translateY: titleTranslateY }, { scale: titleScale }] }]}>
                <Text style={styles.headerTitle}>Customer Feedback</Text>
                <Text style={styles.headerSubtitle}>See what our community is saying about our service.</Text>
                <View style={styles.ratingSummary}>
                    <Ionicons name="star" size={20} color="#FFC107" />
                    <Text style={styles.ratingText}><Text style={{fontWeight: 'bold'}}>{averageRating}</Text> out of 5 stars</Text>
                </View>
            </Animated.View>
        </BlurView>
      </Animated.View>

      {/* Main Content */}
      <Animated.FlatList
        data={filteredFeedbacks}
        keyExtractor={(item) => item._id}
        renderItem={({ item, index }) => <FeedbackCard item={item} profile={profile} onEdit={handleEdit} onDelete={handleDelete} index={index} />}
        contentContainerStyle={styles.listContent}
        refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
        ListHeaderComponent={
            <View>
                <View style={styles.tabContainer}>
                    {['All', 'My Feedback', 'Community'].map(tab => (
                        <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
                            <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                        </TouchableOpacity>
                    ))}
                </View>
                {filteredFeedbacks.length === 0 && renderEmptyState}
            </View>
        }
        onScroll={Animated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: false })}
        scrollEventThrottle={16}
      />

      {!isLoading && (
        <Animatable.View animation="zoomIn" delay={500} style={styles.fabContainer}>
            <TouchableOpacity style={styles.fab} onPress={() => navigation.navigate('FeedbackFormScreen')}>
                <Ionicons name="add" size={32} color={theme.textOnPrimary} />
            </TouchableOpacity>
        </Animatable.View>
      )}
    </SafeAreaView>
  );
}

const getStyles = (theme) => StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.background },
    // Header Styles
    header: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10 },
    headerBlur: { flex: 1, justifyContent: 'flex-end', paddingBottom: 20 },
    headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, position: 'absolute', top: 15, left: 0, right: 15 },
    headerIcon: { width: 40, padding: 5 },
    headerTitleCompact: { fontSize: 25, fontWeight: '600', color: '#b9f7ffff', right: 30, top: 13  },
    headerContent: { alignItems: 'center' },
    headerTitle: { fontSize: 28, fontWeight: 'bold', color: '#FFF', textAlign: 'center' },
    headerSubtitle: { fontSize: 16, color: '#FFF', opacity: 0.85, textAlign: 'center', marginTop: 8 },
    ratingSummary: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.25)', paddingVertical: 6, paddingHorizontal: 12, borderRadius: 15, marginTop: 12 },
    ratingText: { color: '#FFF', fontSize: 14, marginLeft: 8 },

    // Tab Styles
    tabContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 10, backgroundColor: theme.background, borderBottomWidth: 1, borderBottomColor: theme.border, bottom: 10},
    tab: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: theme.surface },
    activeTab: { backgroundColor: theme.primary, elevation: 5, shadowColor: theme.primary, shadowOpacity: 0.3, shadowRadius: 5 },
    tabText: { fontSize: 15, fontWeight: '600', color: theme.textSecondary },
    activeTabText: { color: theme.textOnPrimary },

    // List & Empty State Styles
    listContent: { paddingTop: 215, paddingBottom: 120 },
    emptyContainer: { alignItems: 'center', padding: 30, marginTop: 40 },
    emptyText: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginTop: 16, textAlign: 'center' },
    emptySubtext: { fontSize: 15, color: theme.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 22 },
    emptyButton: { flexDirection: 'row', alignItems: 'center', marginTop: 24, backgroundColor: theme.primary, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 30 },
    emptyButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold', marginLeft: 8 },

    // Neumorphic Card Styles
    card: { backgroundColor: theme.surface, borderRadius: 20, padding: 20, marginHorizontal: 20, marginBottom: 20, shadowColor: theme.isDarkMode ? '#000' : '#A0A0A0', shadowOffset: { width: 4, height: 4 }, shadowOpacity: 0.4, shadowRadius: 6, elevation: 8, borderWidth: 1, borderColor: `${theme.border}50` },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    name: { fontSize: 17, fontWeight: 'bold', color: theme.text },
    stars: { flexDirection: 'row', marginTop: 4 },
    feedback: { fontSize: 15, color: theme.textSecondary, lineHeight: 24, marginTop: 16 },
    
    // Card Elements
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16 },
    tag: { backgroundColor: `${theme.primary}20`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    tagText: { color: theme.primary, fontSize: 13, fontWeight: '600' },
    seeMoreButton: { alignSelf: 'flex-start', marginTop: 10 },
    seeMoreText: { color: theme.primary, fontSize: 15, fontWeight: 'bold' },
    
    // Popover Menu
    menuButton: { position: 'absolute', top: -5, right: -10, padding: 8 },
    popoverMenu: { position: 'absolute', top: 50, right: 20, backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, elevation: 15, shadowColor: '#000', shadowOpacity: 0.15, shadowRadius: 20, zIndex: 100 },
    popoverItem: { flexDirection: 'row', alignItems: 'center', padding: 12, width: 120 },
    popoverText: { fontSize: 15, color: theme.text, marginLeft: 10 },
    popoverDivider: { height: 1, backgroundColor: theme.border },
    
    // Glassmorphic FAB
    fabContainer: { position: 'absolute', bottom: 20, right: 20, backgroundColor: theme.primary, borderRadius: 50,},
    fab: { width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
    fabBlur: { ...StyleSheet.absoluteFillObject },
});