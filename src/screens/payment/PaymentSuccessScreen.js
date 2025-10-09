//Payment Success
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PaymentSuccessScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Payment Successful!</Text>
        <Text style={styles.message}>
          Thank you for your payment. Your subscription has been updated.
        </Text>
        <Button
          title="Back to Home"
          onPress={() => navigation.navigate('Home')} // Adjust 'Home' to your main screen's route name
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f0fdf4', // Light green background
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#166534', // Dark green text
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#15803d', // Medium green text
    marginBottom: 24,
  },
});

export default PaymentSuccessScreen;