//Payment Failure
import React from 'react';
import { View, Text, StyleSheet, Button } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PaymentFailureScreen = ({ navigation }) => {
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Payment Failed</Text>
        <Text style={styles.message}>
          Unfortunately, your payment could not be processed. Please try again.
        </Text>
        <Button
          title="Try Again"
          onPress={() => navigation.goBack()} // Go back to the previous screen (e.g., billing)
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fef2f2', // Light red background
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
    color: '#991b1b', // Dark red text
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    color: '#b91c1c', // Medium red text
    marginBottom: 24,
  },
});

export default PaymentFailureScreen;