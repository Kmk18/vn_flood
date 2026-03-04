import React, { useState } from 'react';
import { View, Text, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, useColorScheme } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { Input } from '../components/Input';
import { Button } from '../components/Button';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  sources?: string[];
}

export const ChatbotScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  
  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hello. I am the VNFlood Emergency Assistant. How can I help you today?', isBot: true }
  ]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const newUserMsg: Message = { id: Date.now().toString(), text: inputText, isBot: false };
    setMessages((prev) => [...prev, newUserMsg]);
    setInputText('');

    // Mock bot response
    setTimeout(() => {
      const newBotMsg: Message = { 
        id: (Date.now() + 1).toString(), 
        text: 'The river level is currently stable, but heavy rain is expected this evening.', 
        isBot: true,
        sources: ['National Hydro-Meteorological Service', 'Local Water Station Alpha']
      };
      setMessages((prev) => [...prev, newBotMsg]);
    }, 1000);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isBot = item.isBot;
    return (
      <View style={[
        styles.messageBubble, 
        isBot ? [styles.botBubble, { backgroundColor: themeColors.card, borderColor: themeColors.border }] 
              : [styles.userBubble, { backgroundColor: themeColors.primary }]
      ]}>
        <Text style={[Typography.body1, { color: isBot ? themeColors.text : '#FFF' }]}>
          {item.text}
        </Text>
        {isBot && item.sources && (
          <View style={styles.sourcesContainer}>
            <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>Sources:</Text>
            {item.sources.map((s, i) => (
              <Text key={i} style={[Typography.caption, { color: themeColors.primary, fontStyle: 'italic' }]}>
                - {s}
              </Text>
            ))}
          </View>
        )}
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.header}>
        <Text style={[styles.title, Typography.h2, { color: themeColors.text }]}>AI Assistant</Text>
      </View>

      <ScrollView contentContainerStyle={styles.messageList}>
        {messages.map((item) => <React.Fragment key={item.id}>{renderMessage({ item })}</React.Fragment>)}
      </ScrollView>

      <View style={[styles.inputContainer, { borderTopColor: themeColors.border }]}>
        <View style={styles.inputWrapper}>
          <Input 
            label=""
            placeholder="Type your question..." 
            value={inputText} 
            onChangeText={setInputText}
            isDarkMode={isDarkMode}
          />
        </View>
        <Button 
          title="Send" 
          onPress={handleSend} 
          style={styles.sendButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.l,
    paddingTop: 60,
    paddingBottom: Spacing.s,
  },
  title: {
    textAlign: 'center',
  },
  messageList: {
    padding: Spacing.m,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: Spacing.m,
    borderRadius: 12,
    marginBottom: Spacing.m,
  },
  botBubble: {
    alignSelf: 'flex-start',
    borderWidth: 1,
    borderBottomLeftRadius: 0,
  },
  userBubble: {
    alignSelf: 'flex-end',
    borderBottomRightRadius: 0,
  },
  sourcesContainer: {
    marginTop: Spacing.s,
    paddingTop: Spacing.s,
    borderTopWidth: 0.5,
    borderTopColor: '#CCC',
  },
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.s,
    paddingBottom: Spacing.l,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    marginRight: Spacing.s,
  },
  sendButton: {
    height: 50,
    marginTop: Spacing.m,
  },
});
