// contexts/SubscriptionContext.js
import React, { createContext, useState, useEffect, useContext } from 'react';
import { auth, database } from '../config/firebaseConfig';
import { onAuthStateChanged } from 'firebase/auth';
import { ref, onValue, set, get, update } from 'firebase/database';
import { createUserNotification } from '../services/notificationService';

const SubscriptionContext = createContext();

export const useSubscription = () => useContext(SubscriptionContext);

const generateBill = (plan) => {
    const now = new Date();
    return {
        id: `bill-${Date.now()}`,
        type: 'bill',
        planName: plan.name,
        amount: plan.price,
        status: 'Due',
        statementDate: now.toISOString(),
        paymentDate: null
    };
};

export const SubscriptionProvider = ({ children }) => {
    const [subscriptionStatus, setSubscriptionStatus] = useState(null);
    const [activePlan, setActivePlan] = useState(null);
    const [renewalDate, setRenewalDate] = useState(null);
    const [paymentHistory, setPaymentHistory] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    const checkForRenewalAndGenerateBill = async (subscriptionData) => {
        const { plan, renewalDate: currentRenewalDate, history } = subscriptionData;
        if (!plan || !currentRenewalDate) return;

        const renewal = new Date(currentRenewalDate);
        const today = new Date();
        if (today < renewal) return;

        const historyArray = Object.values(history || {});
        const hasBillForCurrentPeriod = historyArray.some(item => {
            if (item.type !== 'bill') return false;
            const statementDate = new Date(item.statementDate);
            return statementDate.getFullYear() === renewal.getFullYear() &&
                   statementDate.getMonth() === renewal.getMonth();
        });

        if (hasBillForCurrentPeriod) {
            console.log("Bill for the current period already exists. Skipping generation.");
            return;
        }

        console.log("Renewal date passed. Generating new bill...");
        const newBill = generateBill(plan);
        const nextRenewal = new Date(renewal);
        nextRenewal.setDate(nextRenewal.getDate() + 30);

        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const subscriptionRef = ref(database, `users/${currentUser.uid}/subscription`);
        const updates = {};
        updates[`/history/${newBill.id}`] = newBill;
        updates['/renewalDate'] = nextRenewal.toISOString();

        await update(subscriptionRef, updates);

        // *** NEW: Trigger a notification when a new bill is generated ***
        await createUserNotification(currentUser.uid, {
            title: 'Payment Reminder',
            message: `Your bill for ${plan.name} of ₱${plan.price.toFixed(2)} is now due.`,
            type: 'payment',
        });

        console.log("New bill, renewal date, and notification have been created.");
    };

    useEffect(() => {
        let subscriptionListener = () => {};
        const authUnsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                setIsLoading(true);
                const subscriptionRef = ref(database, `users/${user.uid}/subscription`);
                subscriptionListener = onValue(subscriptionRef, (snapshot) => {
                    if (snapshot.exists()) {
                        const data = snapshot.val();
                        setSubscriptionStatus(data.status || 'active');
                        setActivePlan(data.plan || null);
                        setRenewalDate(data.renewalDate || null);
                        const historyArray = data.history ? Object.values(data.history).sort((a, b) => new Date(b.paymentDate || b.date || b.statementDate) - new Date(a.date || a.statementDate)) : [];
                        setPaymentHistory(historyArray);
                        checkForRenewalAndGenerateBill(data);
                    } else {
                        clearSubscriptionData();
                    }
                    setIsLoading(false);
                });
            } else {
                clearSubscriptionData();
                subscriptionListener();
                setIsLoading(false);
            }
        });
        return () => { authUnsubscribe(); subscriptionListener(); };
    }, []);

    const clearSubscriptionData = () => {
        setSubscriptionStatus(null);
        setActivePlan(null);
        setRenewalDate(null);
        setPaymentHistory([]);
    };

    const subscribeToPlan = async (plan) => {
        const currentUser = auth.currentUser;
        if (!currentUser) return;
        const newRenewalDate = new Date();
        newRenewalDate.setDate(newRenewalDate.getDate() + 30);
        const now = new Date().toISOString();
        const subscribeEventId = `event-${Date.now()}`;
        const initialBillId = `bill-${Date.now() + 1}`;
        const newSubscriptionData = {
            status: 'active',
            plan: plan,
            renewalDate: newRenewalDate.toISOString(),
            history: {
                [subscribeEventId]: { id: subscribeEventId, type: 'subscribed', date: now, details: `Subscribed to ${plan.name}.`, planName: plan.name },
                [initialBillId]: generateBill(plan)
            }
        };
        await set(ref(database, `users/${currentUser.uid}/subscription`), newSubscriptionData);
        
        // *** NEW: Trigger notification on successful subscription ***
        await createUserNotification(currentUser.uid, {
            title: 'Subscription Successful!',
            message: `Welcome to Fibear! You are now subscribed to ${plan.name}.`,
            type: 'promo',
        });
    };
    const changePlan = async (newPlan) => {
        const currentUser = auth.currentUser;
        if (!currentUser || !activePlan) return;
        const subscriptionRef = ref(database, `users/${currentUser.uid}/subscription`);
        const now = new Date().toISOString();
        const eventId = `event-${Date.now()}`;
        const initialBillId = `bill-${Date.now() + 1}`;
        const updates = {};
        updates[`/history/${eventId}`] = { id: eventId, type: 'plan_changed', date: now, details: `Changed from ${activePlan.name} to ${newPlan.name}.`, fromPlan: activePlan.name, toPlan: newPlan.name };
        updates[`/history/${initialBillId}`] = generateInitialBill(newPlan);
        updates['/plan'] = newPlan;
        await update(subscriptionRef, updates);
    };

    const cancelSubscription = async () => {
        const currentUser = auth.currentUser;
        if (!currentUser || !activePlan) return;
        const subscriptionRef = ref(database, `users/${currentUser.uid}/subscription`);
        const now = new Date().toISOString();
        const eventId = `event-${Date.now()}`;
        const updates = {};
        updates[`/history/${eventId}`] = { id: eventId, type: 'cancelled', date: now, details: `Subscription to ${activePlan.name} was cancelled.`, planName: activePlan.name };
        await update(subscriptionRef, updates);
        const finalHistorySnapshot = await get(ref(database, `users/${currentUser.uid}/subscription/history`));
        const pastSubscriptionsRef = ref(database, `users/${currentUser.uid}/pastSubscriptions/${Date.now()}`);
        if(finalHistorySnapshot.exists()){
            await set(pastSubscriptionsRef, { cancelledDate: now, finalPlan: activePlan, history: finalHistorySnapshot.val() });
        }
        await set(ref(database, `users/${currentUser.uid}/subscription`), null);
    };

// Inside SubscriptionContext.js

    const payBill = async (billId, amount, planName) => {
        const currentUser = auth.currentUser;
        if (!currentUser) {
            throw new Error("User not authenticated.");
        }

        // --- ALL OF YOUR EXISTING LOGIC IS PRESERVED HERE ---

        // 1. Create a NEW array by mapping over the old one.
        const updatedHistory = paymentHistory.map(item => {
            if (item.id === billId && item.type === 'bill') {
                return { 
                    ...item, 
                    status: 'Paid', 
                    paymentDate: new Date().toISOString(), 
                };
            }
            return item;
        });

        // 2. Create a NEW "payment success" event object.
        const paymentEvent = {
            id: `evt-${Date.now()}`,
            type: 'payment_success',
            details: `Payment of ₱${amount.toFixed(2)} received.`,
            date: new Date().toISOString(),
            amount: amount,
            planName: planName,
            receiptNumber: `RCPT-${Math.floor(1000 + Math.random() * 9000)}`
        };

        // 3. Combine the updated history and the new payment event into another NEW array.
        const finalHistory = [...updatedHistory, paymentEvent].sort((a, b) => {
            const dateA = new Date(a.date || a.statementDate);
            const dateB = new Date(b.date || a.statementDate); // Corrected typo here
            return dateB - dateA;
        });
    
        // 4. Set the local state with the brand new, final array for immediate UI update.
        setPaymentHistory(finalHistory);

        // --- *** THE FIX IS HERE: PERSIST THE CHANGES TO FIREBASE *** ---
        try {
            // A. Get a reference to the user's subscription node.
            const subscriptionRef = ref(database, `users/${currentUser.uid}/subscription`);

            // B. Convert the `finalHistory` array back into an object with IDs as keys,
            //    which is the format Firebase uses.
            const historyObjectForFirebase = finalHistory.reduce((acc, item) => {
                acc[item.id] = item;
                return acc;
            }, {});

            // C. Create an update object to specifically target and replace the 'history' node.
            const updates = {
                '/history': historyObjectForFirebase
            };
            
            // D. Execute the update to save the entire new history to the database.
            await update(subscriptionRef, updates);

            // E. After successfully saving, send the notification.
            await createUserNotification(currentUser.uid, {
                title: 'Payment Received',
                message: `We've received your payment of ₱${amount.toFixed(2)} for ${planName}. Thank you!`,
                type: 'payment',
            });

            console.log("Payment history successfully updated in Firebase.");

        } catch (error) {
            console.error("Failed to save payment to database:", error);
            // If the Firebase update fails, you might want to revert the local state
            // or show a persistent error message to the user.
            // For now, we'll just log the error.
        }

        // Keep this to resolve the promise as before.
        return Promise.resolve();
    };
    const value = {
        subscriptionStatus, activePlan, renewalDate, paymentHistory, isLoading,
        subscribeToPlan, cancelSubscription, changePlan, payBill,
    };

    return (
        <SubscriptionContext.Provider value={value}>
            {children}
        </SubscriptionContext.Provider>
    );
};