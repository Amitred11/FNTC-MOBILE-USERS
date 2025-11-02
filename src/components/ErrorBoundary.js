// src/components/ErrorBoundary.js
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import * as Updates from 'expo-updates';
import Clipboard from '@react-native-clipboard/clipboard';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({
      errorInfo: errorInfo,
    });
    console.log('UNCAUGHT ERROR:', error, errorInfo);
  }

  handleRestart = () => {
    Updates.reloadAsync();
  };

  handleCopyError = () => {
    const errorDetails = `
--- App Error Report ---
Error:
${this.state.error?.toString()}

Component Stack:
${this.state.errorInfo?.componentStack}
-------------------------
    `;
    Clipboard.setString(errorDetails.trim());
    Alert.alert('Copied to Clipboard', 'Error details have been copied.');
  };

  render() {
    if (this.state.hasError) {
      return (
        <View style={styles.container}>
          <ScrollView contentContainerStyle={styles.scrollContent}>
            <Text style={styles.title}>Something went wrong.</Text>
            <Text style={styles.subtitle}>
              An unexpected error occurred. You can help us fix it by sending a report.
            </Text>

            <View style={styles.buttonContainer}>
              <TouchableOpacity style={[styles.button, styles.restartButton]} onPress={this.handleRestart}>
                <Text style={styles.buttonText}>Restart App</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.copyButton]} onPress={this.handleCopyError}>
                <Text style={styles.buttonText}>Copy Error Details</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.errorBox}>
              <Text style={styles.errorHeader}>Error Message:</Text>
              <Text style={styles.errorText}>
                {this.state.error && this.state.error.toString()}
              </Text>

              {this.state.errorInfo && (
                <>
                  <Text style={styles.errorHeader}>Component Stack Trace:</Text>
                  <Text style={styles.errorText}>
                    {this.state.errorInfo.componentStack}
                  </Text>
                </>
              )}
            </View>
          </ScrollView>
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
    paddingTop: 50,
  },
  scrollContent: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#343a40',
    textAlign: 'center',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#6c757d',
    textAlign: 'center',
    marginBottom: 20,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 20,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  restartButton: {
    backgroundColor: '#007bff',
  },
  copyButton: {
    backgroundColor: '#6c757d',
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: '#fff3f3',
    borderRadius: 8,
    padding: 15,
    width: '100%',
    marginTop: 10,
  },
  errorHeader: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#721c24',
    marginBottom: 5,
  },
  errorText: {
    color: '#721c24',
    fontSize: 13,
    fontFamily: 'monospace',
    marginBottom: 15,
  },
});

export default ErrorBoundary;