import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  View, Text, StyleSheet, Image, ScrollView, TouchableOpacity,
  Modal, TouchableWithoutFeedback, SafeAreaView, BackHandler
} from 'react-native';
import { Ionicons, FontAwesome, MaterialIcons, Feather, FontAwesome5 } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { auth, database } from '../config/firebaseConfig';
import { signOut } from 'firebase/auth';
import { ref, get, onValue, query, orderByChild, limitToLast } from 'firebase/database';
import * as Animatable from 'react-native-animatable';
import { useSubscription } from '../contexts/SubscriptionContext';
import { useTheme } from '../contexts/ThemeContext';

// --- DRAWER ITEM COMPONENT (Now Theme-Aware) ---
// Note: This needs the getStyles function to be defined before it.
const DrawerItem = ({ icon, label, onPress, theme }) => {
  const styles = getStyles(theme); // This component needs access to the styles
  const IconMap = {
    'person-outline': <Ionicons name="person-outline" size={22} color={theme.text} />,
    'notifications-outline': <Ionicons name="notifications-outline" size={22} color={theme.text} />,
    'settings': <Ionicons name="settings-outline" size={22} color={theme.text} />,
    'chat-outline': <Ionicons name="chatbubbles-outline" size={24} color={theme.text} />,
  };
  return (
    <TouchableOpacity style={styles.amenuItem} onPress={onPress}>
      {IconMap[icon]}
      <Text style={styles.amenuLabel}>{label}</Text>
    </TouchableOpacity>
  );
};

// --- MAIN HOME PAGE COMPONENT ---
export default function HomePage() {
  const { theme } = useTheme();
  const styles = getStyles(theme);

  const scrollViewRef = useRef(null);
  const navigation = useNavigation();
  const [isMenuVisible, setMenuVisible] = useState(false);
  const [isLogout, setLogout] = useState(false);
  const [isExitModalVisible, setExitModalVisible] = useState(false);
  const [user, setUser] = useState(null);
  const [feedbacks, setFeedbacks] = useState([]);
  const { activePlan, paymentHistory } = useSubscription();

  useEffect(() => {
    const feedbackRef = ref(database, 'customer_feedback');
    const feedbackQuery = query(feedbackRef, orderByChild('timestamp'), limitToLast(5));
    const unsubscribe = onValue(feedbackQuery, (snapshot) => {
      if (snapshot.exists()) {
        setFeedbacks(Object.values(snapshot.val()).reverse());
      } else {
        setFeedbacks([]);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const userProfileRef = ref(database, `users/${currentUser.uid}`);
        const snapshot = await get(userProfileRef);
        let fullUserProfile = { uid: currentUser.uid, displayName: currentUser.displayName, email: currentUser.email, photoData: null };
        if (snapshot.exists()) {
          fullUserProfile = { ...fullUserProfile, ...snapshot.val() };
        }
        setUser(fullUserProfile);
      } else {
        setUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const backAction = () => {
      if (isMenuVisible) { closeModal(); return true; }
      if (isLogout) { closeLogout(); return true; }
      setExitModalVisible(true);
      return true;
    };
    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [isMenuVisible, isLogout]);

  const accountBoxes = useMemo(() => {
    if (activePlan) {
      const dueBill = paymentHistory.find(bill => bill.status === 'Due');
      const bandwidth = activePlan.features && activePlan.features.length > 0 ? activePlan.features[0] : 'N/A';
      const billAmount = dueBill ? dueBill.amount : 0;
      return [
        { title: 'Total Bills', value: `₱${billAmount.toFixed(2)}`, status: dueBill ? 'Due' : 'Paid' },
        { title: 'Current Plan', value: activePlan.name, status: 'Info' },
        { title: 'Bandwidth', value: bandwidth, status: 'Info' },
      ];
    }
    return [
      { title: 'Total Bills', value: '₱0.00', status: 'Paid' },
      { title: 'Current Plan', value: 'None', status: 'Info' },
      { title: 'Get a Plan!', value: 'Subscribe Now', status: 'Action' },
    ];
  }, [activePlan, paymentHistory]);

  const accountDetailsWidth = accountBoxes.length * (155 + 20);

  const handleMenu = () => setMenuVisible(true);
  const closeModal = () => setMenuVisible(false);
  const closeLogout = () => setLogout(false);
  const closeExitModal = () => setExitModalVisible(false);
  const LogOut = () => { setMenuVisible(false); setLogout(true); };

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.reset({ index: 0, routes: [{ name: 'GetStarted' }] });
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };
  
  const handleExitApp = () => BackHandler.exitApp();
  const profile = () => navigation.navigate('Profile');
  const navigateAndCloseDrawer = (screenName) => {
    navigation.navigate(screenName);
    closeModal();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Exit Modal */}
      <Modal animationType="fade" transparent={true} visible={isExitModalVisible} onRequestClose={closeExitModal}>
        <View style={styles.logmodalOverlay}>
            <View style={styles.logmodalContent}>
                <Image source={require('../assets/images/logoutpic.png')} style={styles.logimage}/>
                <Text style={styles.logtitle}>Exit Application?</Text>
                <Text style={styles.logmodalDescription}>Are you sure you want to close the application?</Text>
                <View style={styles.logbuttonContainer}>
                    <TouchableOpacity style={styles.logcancelButton} onPress={closeExitModal}><Text style={styles.logcancelText}>No, Just kidding</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.logconfirmButton} onPress={handleExitApp}><Text style={styles.logconfirmText}>Yes, Exit</Text></TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* Header */}
      <View style={styles.fixedHeader}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleMenu}><Ionicons name="menu" size={26} color={theme.text} /></TouchableOpacity>
          <View style={styles.headerRightIcons}>
            <TouchableOpacity onPress={() => navigation.navigate('Notif')} style={styles.notificationIcon}>
              <Ionicons name="notifications-outline" size={24} color={theme.text} />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
            <Image source={require('../assets/images/logo.png')} style={styles.logoFixed} />
          </View>
        </View>
      </View>

      {/* Drawer Menu Modal */}
      <Modal animationType="fade" transparent={true} visible={isMenuVisible} onRequestClose={closeModal}>
        <View style={styles.drawerOverlay}>
            <Animatable.View animation="fadeInLeft" duration={400} style={styles.acontainer}>
                <View style={styles.aheader}><TouchableOpacity onPress={closeModal} style={styles.abackIcon}><Ionicons name="arrow-back" size={24} color={theme.textOnPrimary} /></TouchableOpacity><View style={styles.aprofileSection}><Text style={styles.ausername} numberOfLines={1}>{user?.displayName || 'User'}</Text><Text style={styles.aemail} numberOfLines={1}>{user?.email || 'No email provided'}</Text></View><Image source={ user?.photoData?.base64 ? { uri: `data:${user.photoData.mimeType};base64,${user.photoData.base64}` } : require('../assets/images/profilepic.jpg') } style={styles.aprofileImage} /></View>
                <ScrollView style={styles.amenu}>
                    <DrawerItem icon="person-outline" label="Profile" onPress={() => navigateAndCloseDrawer('Profile')} theme={theme}/>
                    <DrawerItem icon="notifications-outline" label="Notifications" onPress={() => navigateAndCloseDrawer('Notif')} theme={theme}/>
                    <DrawerItem icon="settings" label="Settings" onPress={() => navigateAndCloseDrawer('Settings')} theme={theme}/>
                    <DrawerItem icon="chat-outline" label="Customer Feedback" onPress={() => navigateAndCloseDrawer('CustomerFeedbackScreen')} theme={theme}/>
                </ScrollView>
                <TouchableOpacity style={styles.alogoutButton} onPress={LogOut}><Feather name="log-out" size={20} color={theme.textOnPrimary} /><Text style={styles.alogoutText}>Logout</Text></TouchableOpacity>
            </Animatable.View>
            <TouchableWithoutFeedback onPress={closeModal}><View style={styles.drawerBackdrop} /></TouchableWithoutFeedback>
        </View>
      </Modal>

      {/* Logout Modal */}
      <Modal animationType="fade" transparent={true} visible={isLogout} onRequestClose={closeLogout}>
        <View style={styles.logmodalOverlay}>
            <View style={styles.logmodalContent}>
                <Image source={require('../assets/images/logoutpic.png')} style={styles.logimage}/>
                <Text style={styles.logtitle}>Logging Out</Text>
                <Text style={styles.logmodalDescription}>Are you sure you want to log out?</Text>
                <View style={styles.logbuttonContainer}>
                    <TouchableOpacity style={styles.logcancelButton} onPress={closeLogout}><Text style={styles.logcancelText}>No, Just kidding</Text></TouchableOpacity>
                    <TouchableOpacity style={styles.logconfirmButton} onPress={handleSignOut}><Text style={styles.logconfirmText}>Yes, Log Me Out</Text></TouchableOpacity>
                </View>
            </View>
        </View>
      </Modal>

      {/* Main content area */}
  <ScrollView style={styles.scrollContainer} contentContainerStyle={{ paddingTop: 80, paddingBottom: 110,  }} showsVerticalScrollIndicator={false}>
      <>
        <View style={styles.banner}>
          <Image source={require('../assets/images/home.jpg')} style={[styles.bannerImage, { opacity: theme.isDarkMode ? 1 : 0.8 }]} />
          <Image
            source={
              user?.photoData?.base64
                ? { uri: `data:${user.photoData.mimeType};base64,${user.photoData.base64}` }
                : require('../assets/images/profilepic.jpg')
            }
            style={styles.profilePic}
          />
          <View style={{flexDirection: 'row', alignItems: 'center', position: 'absolute', bottom: 60, left: 90,}}>
          <Text style={styles.welcome}>Welcome back,</Text> 
          <Text style={styles.welcomeText}>{user?.displayName?.trim().split(' ')[0] || 'User'}!</Text>
          </View>
          <Text style={{ fontSize: 12, bottom: 40, right: 30, opacity: 0.9, color: theme.text }}>{user?.email}</Text>
        </View>
            
            <View style={styles.accountOverview}>
              <Text style={styles.sectionTitle}>Account Overview</Text>
              <View style={styles.accountHeader}>
                <Text style={styles.accountSubtitle}>Quick look at your bills and plans</Text>
              </View>
              <ScrollView ref={scrollViewRef} horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingHorizontal: 15}}>
                  {accountBoxes.map((box, index) => {
                    let boxStyle = [styles.accountBox];
                    if (box.status === 'Paid') boxStyle = [styles.accountBox, styles.accountBoxPaid];
                    else if (box.status === 'Due') boxStyle = [styles.accountBox, styles.accountBoxDue];
                    else if (box.status === 'Action') boxStyle = [styles.accountBox, styles.accountBoxAction];
                    return (
                      <TouchableOpacity key={index} style={boxStyle} onPress={() => navigation.navigate(box.status === 'Action' ? 'Subscription' : 'MyBills')} activeOpacity={0.8}>
                        <Text style={styles.accountValue}>{box.title}</Text>
                        <Text style={styles.accountLabel}>{box.value}</Text>
                      </TouchableOpacity>
                    );
                  })}
              </ScrollView>
            </View>

            <View style={styles.plansSection}>
              <View style={styles.plansHeader}><Text style={styles.PlanTitle}>Available Plans</Text></View>
              {PLANS.map((plan, index) => (
                <TouchableOpacity key={index} style={styles.planItem}>
                    <Image source={plan.Image} style={styles.planImage} />
                    <View style={styles.planInfo}><Text style={styles.planName}>{plan.name}</Text><Text style={styles.planDescription}>{plan.value}</Text></View>
                    <Text style={styles.planPrice}>{plan.price}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={styles.bottomButtons}>
              <TouchableOpacity onPress={() => navigation.navigate('MyBills')}><View style={styles.Bills}><Text style={styles.textBills}> Manage Bills</Text></View></TouchableOpacity>
              <TouchableOpacity onPress={() => navigation.navigate('PayBills')}><View style={styles.Bills}><Text style={styles.textBills}>Pay Bills</Text></View></TouchableOpacity>
            </View>

            <View style={styles.feedbackSection}>
              <Text style={styles.feedbackHeader}>Customer Feedback</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{paddingLeft: 15, paddingBottom: 15}}>
                    {feedbacks.length > 0 ? (
                      feedbacks.map((item, index) => (
                        <View style={styles.card} key={index}>
                          <View style={styles.rowlogo}><Image style={styles.avatar} source={item.userPhotoUrl ? { uri: item.userPhotoUrl } : require('../assets/images/profilepic.jpg')} /><Text style={styles.name}>{item.userName}</Text></View>
                          <View style={styles.stars}>{Array.from({ length: 5 }).map((_, i) => (<FontAwesome key={i} name={i < item.rating ? "star" : "star-o"} size={16} color="#FFD700" />))}</View>
                          <Text style={styles.feedback} numberOfLines={2}>{item.text}</Text>
                        </View>
                      ))
                    ) : ( <View style={styles.card}><Text style={styles.feedback}>Be the first to leave feedback!</Text></View> )}
              </ScrollView>
            </View>
          </>
      </ScrollView>

      <View style={styles.fixedDown}>
        <View style={styles.downnav}>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Home')}><Ionicons name="home" size={28} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Home</Text></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Subscription')}><FontAwesome5 name="id-card" size={24} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Subscription</Text></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('MyBills')}><MaterialIcons name="payment" size={28} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Billing</Text></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={() => navigation.navigate('Support')}><Ionicons name="chatbubble-ellipses" size={28} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Support</Text></TouchableOpacity>
          <TouchableOpacity style={styles.navItem} onPress={profile}><Ionicons name="person-circle" size={28} color={theme.textOnPrimary} /><Text style={styles.navlabel}>Profile</Text></TouchableOpacity>
       </View>
      </View>
    </SafeAreaView>
  );
}

// --- Static Data ---
const PLANS = [
  { Image: require('../assets/images/bronze.png'), name: 'PLAN BRONZE', value: 'Up to 30 mbps', price: '₱700/month' },
  { Image: require('../assets/images/silver.png'), name: 'PLAN SILVER', value: 'Up to 50 mbps', price: '₱800/month' },
  { Image: require('../assets/images/gold.png'), name: 'PLAN GOLD', value: 'Up to 75 mbps', price: '₱1,000/month' },
  { Image: require('../assets/images/platinum.png'), name: 'PLAN PLATINUM', value: 'Up to 100 mbps', price: '₱1,300/month' },
  { Image: require('../assets/images/diamond.png'), name: 'PLAN DIAMOND', value: 'Up to 120 mbps', price: '₱1,500/month' },
];

// --- Stylesheet is now a function that accepts the theme ---
const getStyles = (theme) => StyleSheet.create({
  container: { backgroundColor: theme.surface, flex: 1 },
  scrollContainer: { flex: 1, backgroundColor: theme.background },
  fixedHeader: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 10, paddingTop: 40, backgroundColor: theme.isDarkMode ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)' },
  headerContent: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 15, height: 60 },
  headerRightIcons: { flexDirection: 'row', alignItems: 'center' },
  notificationIcon: { position: 'relative' },
  notificationBadge: { position: 'absolute', right: 0, top: 0, backgroundColor: theme.danger, width: 9, height: 9, borderRadius: 5, borderWidth: 1.5, borderColor: 'transparent' },
  logoFixed: { width: 80, height: 30, resizeMode: 'contain', marginLeft: 16 },
  banner: { alignItems: 'center', backgroundColor: theme.surface, paddingTop: 10 },
  bannerImage: { width: '100%', height: 350, bottom: 90, borderBottomLeftRadius: 60, borderBottomRightRadius: 60   },
  profilePic: { width: 50, height: 50, borderRadius: 25, borderWidth: 2, borderColor: theme.surface, position: 'absolute', bottom: 37, left: 30 },
  welcome: { fontSize: 16, marginRight: 4,  color: theme.text, fontWeight: '700' },
  welcomeText: { fontSize: 16, color: theme.text, fontWeight: '700', maxWidth: 150 },
  summaryText: { fontSize: 12, position: 'absolute', bottom: 40, left: 120, color: theme.textSecondary },
  accountOverview: { marginTop: -20, backgroundColor: theme.background, paddingVertical: 20, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  sectionTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, paddingHorizontal: 15, marginBottom: 5 },
  accountHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, marginBottom: 15 },
  accountSubtitle: { fontSize: 12, color: theme.textSecondary },
  accountBox: { padding: 10, borderRadius: 12, width: 155, height: 96, justifyContent: 'center', alignItems: 'center', marginRight: 10, backgroundColor: theme.accent },
  accountBoxPaid: { backgroundColor: theme.success },
  accountBoxDue: { backgroundColor: theme.danger },
  accountBoxAction: { backgroundColor: theme.primary },
  accountValue: { fontSize: 12, color: theme.textOnPrimary, position: 'absolute', top: 15, left: 15 },
  accountLabel: { fontSize: 16, color: theme.textOnPrimary, fontWeight: '700', alignSelf: 'center', paddingTop: 10 },
  plansSection: { padding: 15, backgroundColor: theme.surface },
  plansHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  PlanTitle: { fontSize: 20, fontWeight: 'bold', color: theme.text, marginBottom: 15 },
  planItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 15, borderBottomWidth: 1, borderColor: theme.border },
  planImage: { width: 34, height: 34, marginRight: 10 },
  planInfo: { flex: 1 },
  planName: { fontSize: 13, color: theme.text, fontWeight: 'bold' },
  planDescription: { fontSize: 10, color: theme.textSecondary },
  planPrice: { fontSize: 13, color: theme.text, fontWeight: '700' },
  bottomButtons: { padding: 15, alignItems: 'center', backgroundColor: theme.surface },
  Bills: { backgroundColor: theme.surface, width: 300, height: 47, borderRadius: 15, marginBottom: 10, borderWidth: 1, borderColor: theme.primary, alignItems: 'center', justifyContent: 'center', sboxShadow: '0 4px 5px rgba(0, 0, 0, 0.6)', },
  textBills: { fontSize: 15, fontWeight: '700', color: theme.primary },
  feedbackSection: { backgroundColor: theme.background, paddingTop: 10 },
  feedbackHeader: { fontSize: 18, fontWeight: 'bold', color: theme.text, marginBottom: 10, paddingHorizontal: 15 },
  card: { backgroundColor: theme.surface, borderColor: theme.border, borderWidth: 1, elevation: 3, shadowColor: '#000', shadowOpacity: theme.isDarkMode ? 0 : 0.1, shadowRadius: 5, borderRadius: 8, padding: 15, marginRight: 12, width: 220 },
  rowlogo: { flexDirection: 'row', gap: 15 },
  avatar: { width: 40, height: 40, borderRadius: 20, marginBottom: 6 },
  name: { fontWeight: 'bold', fontSize: 14, top: 7, color: theme.text },
  stars: { flexDirection: 'row', marginVertical: 4 },
  feedback: { fontSize: 13, color: theme.textSecondary },
  fixedDown: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'transparent' },
  downnav: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', backgroundColor: theme.primary, paddingVertical: 8, paddingHorizontal: 9, borderTopLeftRadius: 20, borderTopRightRadius: 20, height: 65 },
  navItem: { alignItems: 'center', flex: 1},
  navlabel: { color: theme.textOnPrimary, fontSize: 10, marginTop: 4},
  drawerOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', flexDirection: 'row' },
  drawerBackdrop: { flex: 1 },
  acontainer: { backgroundColor: theme.surface, width: '85%', maxWidth: 320, borderRadius: 20, marginLeft: 25, marginTop: 28, marginBottom: 90, overflow: 'hidden', elevation: 10, shadowColor: '#000', shadowOpacity: 0.3, shadowRadius: 10 },
  aheader: { backgroundColor: theme.primary, paddingTop: 40, paddingBottom: 20, paddingHorizontal: 20, borderBottomLeftRadius: 20 },
  abackIcon: { position: 'absolute', top: 20, left: 20, zIndex: 1 },
  aprofileSection: { marginTop: 30, paddingRight: 70 },
  ausername: { color: theme.textOnPrimary, fontSize: 15, fontWeight: 'bold' },
  aemail: { color: theme.textOnPrimary, fontSize: 12, marginTop: 2, opacity: 0.9 },
  aprofileImage: { width: 70, height: 70, borderRadius: 35, position: 'absolute', top: 95, right: 20, borderWidth: 2, borderColor: theme.surface },
  amenu: { marginTop: 30, paddingHorizontal: 10 },
  amenuItem: { flexDirection: 'row',  alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderRadius: 10, borderBottomWidth: 1, borderColor: theme.border, marginBottom: 5 },
  amenuLabel: { fontSize: 12, marginLeft: 20, color: theme.text, fontWeight: '400' },
  alogoutButton: { backgroundColor: theme.primary, margin: 20, marginBottom: 30, marginLeft: 90, paddingVertical: 5, borderRadius: 12, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  alogoutText: { color: theme.textOnPrimary, fontSize: 12, marginLeft: 10, fontWeight: 'bold'},
  logmodalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  logmodalContent: { width: '85%', backgroundColor: theme.surface, borderRadius: 10, padding: 20, alignItems: 'center' },
  logimage: { width: 150, height: 150, marginBottom: 20, resizeMode: 'contain' },
  logtitle: { fontSize: 18, fontWeight: '600', color: theme.text, textAlign: 'center', marginBottom: 10 },
  logmodalDescription: { textAlign: 'center', color: theme.textSecondary, marginBottom: 30 },
  logbuttonContainer: { flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  logcancelButton: { backgroundColor: theme.textSecondary, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
  logconfirmButton: { borderWidth: 1.2, borderColor: theme.text, paddingVertical: 10, paddingHorizontal: 15, borderRadius: 8 },
  logcancelText: { color: theme.textOnPrimary, fontSize: 12 },
  logconfirmText: { color: theme.text, fontSize: 12 },
});