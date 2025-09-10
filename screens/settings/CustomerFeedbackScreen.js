// screens/CustomerFeedbackScreen.js (Final Refactor with Tabs & New Design)

import React, { useState, useCallback, useMemo, useEffect } from 'react';
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
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as Animatable from 'react-native-animatable';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth, useTheme, useAlert } from '../../contexts';

// --- SUB-COMPONENTS ---

const FeedbackCard = React.memo(({ item, profile, onEdit, onDelete }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const [isExpanded, setIsExpanded] = useState(false);
    const [isActiveMenu, setIsActiveMenu] = useState(false);

    const photoUrl = item.userId?.photoUrl;
    const displayName = item.userId?.displayName || 'Anonymous';
    const isOwner = profile?._id === item.userId?._id;

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
    
    const isLongFeedback = mainText.length > 150;
    const toggleExpand = () => setIsExpanded(prev => !prev);
    const toggleMenu = () => setIsActiveMenu(prev => !prev);

    return (
        <TouchableOpacity style={styles.card} activeOpacity={0.9} onPress={() => isActiveMenu && setIsActiveMenu(false)}>
            <View style={styles.cardHeader}>
                <Image style={styles.avatar} source={photoUrl ? { uri: photoUrl } : require('../../assets/images/profilepic.jpg')} />
                <View style={{ flex: 1 }}>
                    <Text style={styles.name}>{displayName}</Text>
                    <View style={styles.stars}>
                        {Array.from({ length: 5 }).map((_, i) => (
                            <Ionicons key={i} name={i < item.rating ? 'star' : 'star-outline'} size={18} color="#FFD700" />
                        ))}
                    </View>
                </View>
                {isOwner && (
                    <TouchableOpacity style={styles.menuButton} onPress={toggleMenu}>
                        <Ionicons name="ellipsis-vertical" size={22} color={theme.textSecondary} />
                    </TouchableOpacity>
                )}
            </View>

            {isActiveMenu && (
                <Animatable.View animation="fadeIn" duration={200} style={styles.popoverMenu}>
                    <TouchableOpacity style={styles.popoverItem} onPress={() => { onEdit(item); toggleMenu(); }}>
                        <Ionicons name="create-outline" size={20} color={theme.text} /><Text style={styles.popoverText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.popoverItem} onPress={() => { onDelete(item._id); toggleMenu(); }}>
                        <Ionicons name="trash-outline" size={20} color={theme.danger} /><Text style={[styles.popoverText, { color: theme.danger }]}>Delete</Text>
                    </TouchableOpacity>
                </Animatable.View>
            )}
            
            <Text style={styles.feedback} numberOfLines={isExpanded ? undefined : 4}>{mainText}</Text>

            {tags.length > 0 && (
                <View style={styles.tagsContainer}>
                    {tags.map(tag => <View key={tag} style={styles.tag}><Text style={styles.tagText}>{tag}</Text></View>)}
                </View>
            )}

            {isLongFeedback && (
                <TouchableOpacity onPress={toggleExpand} style={styles.seeMoreButton}>
                    <Text style={styles.seeMoreText}>{isExpanded ? 'Show Less' : 'Show More'}</Text>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={16} color={theme.primary} />
                </TouchableOpacity>
            )}
        </TouchableOpacity>
    );
});

const FeedbackTabs = React.memo(({ activeTab, setActiveTab }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    const tabs = ['All', 'My Feedback', 'Community'];

    return (
        <View style={styles.tabContainer}>
            {tabs.map(tab => (
                <TouchableOpacity key={tab} style={[styles.tab, activeTab === tab && styles.activeTab]} onPress={() => setActiveTab(tab)}>
                    <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>{tab}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );
});

const EmptyState = ({ icon, title, subtitle, buttonText, onButtonPress }) => {
    const { theme } = useTheme();
    const styles = getStyles(theme);
    return (
        <View style={styles.emptyContainer}>
            <Ionicons name={icon} size={80} color={theme.disabled} />
            <Text style={styles.emptyText}>{title}</Text>
            <Text style={styles.emptySubtext}>{subtitle}</Text>
            {buttonText && onButtonPress && (
                 <TouchableOpacity style={styles.emptyButton} onPress={onButtonPress}>
                    <Text style={styles.emptyButtonText}>{buttonText}</Text>
                </TouchableOpacity>
            )}
        </View>
    );
};

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

  const fetchFeedbacks = useCallback(async () => {
    try {
      const { data } = await api.get('/feedback');
      setAllFeedbacks(data.data || []);
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

  const onRefresh = () => {
    setIsRefreshing(true);
    fetchFeedbacks();
  };

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

  const renderEmptyState = () => {
      if (activeTab === 'My Feedback') {
          return <EmptyState icon="chatbox-ellipses-outline" title="No Feedback From You" subtitle="Share your experience to help us improve." buttonText="Leave Feedback" onButtonPress={() => navigation.navigate('FeedbackFormScreen')} />;
      }
      return <EmptyState icon="chatbubbles-outline" title="No Feedback Yet" subtitle="It's quiet in here... be the first to share your thoughts!" />;
  };

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient colors={theme.isDarkMode ? [theme.surface, theme.background] : [theme.primary, theme.accent]} style={styles.header}>
        <View style={styles.headerBar}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.headerIcon}>
            <Ionicons name="arrow-back" size={26} color={theme.textOnPrimary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Customer Feedback</Text>
            <View style={styles.headerIcon} />
        </View>
        <Text style={styles.headerSubtitle}>See what our community is saying about our service.</Text>
      </LinearGradient>

      <FeedbackTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {isLoading ? (
        <ActivityIndicator style={{ flex: 1 }} size="large" color={theme.primary} />
      ) : (
        <FlatList
          data={filteredFeedbacks}
          keyExtractor={(item) => item._id}
          renderItem={({ item, index }) => (
            <Animatable.View animation="fadeInUp" delay={index * 100} useNativeDriver>
              <FeedbackCard
                item={item}
                profile={profile}
                onEdit={handleEdit}
                onDelete={handleDelete}
              />
            </Animatable.View>
          )}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} tintColor={theme.primary} />}
          ListEmptyComponent={renderEmptyState}
        />
      )}

      {!isLoading && (
        <Animatable.View animation="zoomIn" delay={500}>
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
    header: { paddingTop: 60, paddingBottom: 20, paddingHorizontal: 16 },
    headerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: theme.textOnPrimary },
    headerSubtitle: { fontSize: 16, color: theme.textOnPrimary, opacity: 0.8, textAlign: 'center', marginTop: 10 },
    headerIcon: { width: 40, padding: 5 },

    tabContainer: { flexDirection: 'row', justifyContent: 'center', gap: 10, paddingVertical: 10, backgroundColor: theme.surface, borderBottomWidth: 1, borderBottomColor: theme.border },
    tab: { paddingVertical: 10, paddingHorizontal: 20, borderRadius: 20, backgroundColor: theme.isDarkMode ? theme.background : '#E9E9E9' },
    activeTab: { backgroundColor: theme.primary },
    tabText: { fontSize: 15, fontWeight: '600', color: theme.textSecondary },
    activeTabText: { color: theme.textOnPrimary },

    listContent: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 120 },
    
    emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, marginTop: '20%' },
    emptyText: { fontSize: 22, fontWeight: 'bold', color: theme.text, marginTop: 16, textAlign: 'center' },
    emptySubtext: { fontSize: 16, color: theme.textSecondary, marginTop: 8, textAlign: 'center', lineHeight: 24 },
    emptyButton: { marginTop: 24, backgroundColor: theme.primary, paddingHorizontal: 30, paddingVertical: 14, borderRadius: 30 },
    emptyButtonText: { color: theme.textOnPrimary, fontSize: 16, fontWeight: 'bold' },

    card: { backgroundColor: theme.surface, borderRadius: 20, padding: 20, marginBottom: 20, position: 'relative', boxShadow: `0 2px 4px rgba(0, 0, 0, 0.5)`, },
    cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 15 },
    avatar: { width: 50, height: 50, borderRadius: 25 },
    name: { fontSize: 17, fontWeight: 'bold', color: theme.text },
    stars: { flexDirection: 'row', marginTop: 4 },
    feedback: { fontSize: 16, color: theme.textSecondary, lineHeight: 26, marginTop: 16, fontStyle: 'italic' },
    
    tagsContainer: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 16, borderTopWidth: 1, borderTopColor: theme.border, paddingTop: 16 },
    tag: { backgroundColor: `${theme.primary}20`, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 15 },
    tagText: { color: theme.primary, fontSize: 13, fontWeight: '600' },
    
    seeMoreButton: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', marginTop: 12, paddingVertical: 5 },
    seeMoreText: { color: theme.primary, fontSize: 15, fontWeight: 'bold', marginRight: 4 },
    
    menuButton: { position: 'absolute', top: 12, right: 12, padding: 8, zIndex: 10, borderRadius: 20, backgroundColor: theme.isDarkMode ? `${theme.background}80` : `${theme.surface}80` },
    popoverMenu: { position: 'absolute', top: 55, right: 20, backgroundColor: theme.surface, borderRadius: 12, borderWidth: 1, borderColor: theme.border, elevation: 10, shadowColor: '#000', shadowOpacity: 0.1, shadowRadius: 15, zIndex: 9, overflow: 'hidden' },
    popoverItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 16, width: 140 },
    popoverText: { fontSize: 16, color: theme.text, marginLeft: 12 },
    
    fab: { position: 'absolute', bottom: 100, right: 20, backgroundColor: theme.primary, width: 64, height: 64, borderRadius: 32, justifyContent: 'center', alignItems: 'center', elevation: 8, shadowColor: theme.primary, shadowRadius: 8, shadowOpacity: 0.4, shadowOffset: { width: 0, height: 4 } },
});