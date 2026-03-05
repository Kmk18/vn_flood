import React, { useState } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, useColorScheme } from 'react-native';
import { Colors, Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';
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
    { id: '1', text: 'Xin chào. Tôi là Trợ lý Ứng phó Khẩn cấp VNFlood. Tôi có thể giúp gì cho bạn hôm nay?', isBot: true }
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
        text: 'Mực nước sông hiện tại đang ổn định, nhưng dự kiến sẽ có mưa lớn vào tối nay.', 
        isBot: true,
        sources: ['Trung tâm Dự báo Khí tượng Thủy văn Quốc gia', 'Trạm Nước Địa phương Alpha']
      };
      setMessages((prev) => [...prev, newBotMsg]);
    }, 1000);
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isBot = item.isBot;
    return (
      <View style={[
        GlobalStyles.chatMessageBubble, 
        isBot ? [GlobalStyles.chatBotBubble, { backgroundColor: themeColors.card, borderColor: themeColors.border }] 
              : [GlobalStyles.chatUserBubble, { backgroundColor: themeColors.primary }]
      ]}>
        <Text style={[Typography.body1, { color: isBot ? themeColors.text : '#FFF' }]}>
          {item.text}
        </Text>
        {isBot && item.sources && (
          <View style={GlobalStyles.chatSourcesContainer}>
            <Text style={[Typography.caption, { color: themeColors.textSecondary }]}>Nguồn:</Text>
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
      style={[GlobalStyles.container, { backgroundColor: themeColors.background }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={GlobalStyles.headerContainer}>
        <Text style={[GlobalStyles.headerTitleCenter, Typography.h2, { color: themeColors.text }]}>Trợ lý AI</Text>
      </View>

      <ScrollView contentContainerStyle={GlobalStyles.listContainer}>
        {messages.map((item) => <React.Fragment key={item.id}>{renderMessage({ item })}</React.Fragment>)}
      </ScrollView>

      <View style={[GlobalStyles.chatInputContainer, { borderTopColor: themeColors.border }]}>
        <View style={GlobalStyles.chatInputWrapper}>
          <Input 
            label=""
            placeholder="Nhập câu hỏi của bạn..." 
            value={inputText} 
            onChangeText={setInputText}
            isDarkMode={isDarkMode}
          />
        </View>
        <Button 
          title="Gửi" 
          onPress={handleSend} 
          style={GlobalStyles.chatSendButton}
        />
      </View>
    </KeyboardAvoidingView>
  );
};
