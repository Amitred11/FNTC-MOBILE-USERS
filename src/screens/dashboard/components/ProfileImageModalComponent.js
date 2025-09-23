import React, { useMemo } from 'react';
import { Image, StyleSheet, Modal, TouchableOpacity } from 'react-native';
import { useTheme } from '../../../contexts';


const getStyles = (theme) =>
  StyleSheet.create({
    modalBackground: {
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.9)',
      flex: 1,
      justifyContent: 'center',
      paddingVertical: 50,
    },
    fullScreenImage: {
      flex: 1, 
      width: '80%', 
      borderRadius: 100, 
    },
  });

const ProfileImageModalComponent = React.memo(({ isVisible, onClose, imageSource }) => {
  const { theme } = useTheme(); 
  const styles = useMemo(() => getStyles(theme), [theme]); 

  return (
    <Modal
      visible={isVisible}
      transparent={true}
      onRequestClose={onClose}
      animationType="fade"
    >
      <TouchableOpacity
        style={styles.modalBackground}
        activeOpacity={1}
        onPress={onClose}
      >
        <Image
          source={imageSource}
          style={styles.fullScreenImage}
          resizeMode="contain"
        />
      </TouchableOpacity>
    </Modal>
  );
});

export default ProfileImageModalComponent;