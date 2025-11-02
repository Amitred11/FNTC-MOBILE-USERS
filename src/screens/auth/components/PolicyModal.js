// components/PolicyModal.js

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ScrollView, SafeAreaView } from 'react-native';
import * as Animatable from 'react-native-animatable';

const renderFormattedText = (text) => {
  return text.split('\n').map((line, index) => {
    if (line.startsWith('## ')) {
      return (
        <Text key={index} style={styles.h2}>
          {line.substring(3)}
        </Text>
      );
    }
    if (line.startsWith('### ')) {
      return (
        <Text key={index} style={styles.h3}>
          {line.substring(4)}
        </Text>
      );
    }
    if (line.startsWith('* ')) {
      return (
        <View key={index} style={styles.listItemContainer}>
          <Text style={styles.bulletPoint}>•</Text>
          <Text style={styles.listItemText}>{line.substring(2)}</Text>
        </View>
      );
    }
    if (line.trim() === '') {
      return <View key={index} style={styles.spacer} />;
    }
    return (
      <Text key={index} style={styles.paragraph}>
        {line}
      </Text>
    );
  });
};

const PolicyModal = ({ visible, title, content, onClose }) => {
  const formattedContent = content.replace(
    '{{LAST_UPDATED}}',
    new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  );

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose}>
      <SafeAreaView style={styles.policyModalOverlay}>
        <Animatable.View animation="fadeInUp" duration={400} style={styles.policyModalView}>
          <Text style={styles.policyTitle}>{title}</Text>
          <ScrollView style={styles.policyScrollView} contentContainerStyle={{ paddingBottom: 20 }}>
            {renderFormattedText(formattedContent)}
          </ScrollView>
          <TouchableOpacity style={styles.policyCloseButton} onPress={onClose}>
            <Text style={styles.policyCloseButtonText}>Close</Text>
          </TouchableOpacity>
        </Animatable.View>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  policyModalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  policyModalView: {
    height: '85%',
    width: '90%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  policyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 15,
    color: '#333',
    textAlign: 'center',
  },
  policyScrollView: {
    width: '100%',
    marginVertical: 10,
  },
  h2: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111',
    marginTop: 15,
    marginBottom: 8,
  },
  h3: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#222',
    marginTop: 12,
    marginBottom: 6,
  },
  paragraph: {
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
    marginBottom: 10,
  },
  listItemContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    paddingLeft: 10,
  },
  bulletPoint: {
    fontSize: 14,
    lineHeight: 22,
    marginRight: 8,
    color: '#333',
  },
  listItemText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 22,
    color: '#333',
  },
  spacer: {
    height: 10,
  },
  // --- Close Button ---
  policyCloseButton: {
    backgroundColor: '#d9534f',
    borderRadius: 10,
    paddingVertical: 12,
    elevation: 2,
    marginTop: 15,
    width: '100%',
  },
  policyCloseButtonText: {
    color: 'white',
    fontWeight: 'bold',
    textAlign: 'center',
    fontSize: 16,
  },
});

export default React.memo(PolicyModal);