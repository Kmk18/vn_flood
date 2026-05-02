import React, { useState, useRef } from 'react';
import { View, Text, KeyboardAvoidingView, Platform, ScrollView, useColorScheme, StyleSheet, TextInput, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  sources?: string[];
}

export const ChatbotScreen = () => {
  const isDarkMode = useColorScheme() === 'dark';
  const themeColors = isDarkMode ? Colors.dark : Colors.light;
  const scrollRef = useRef<ScrollView>(null);

  const [inputText, setInputText] = useState('');
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Xin chào! Tôi là trợ lý VNFlood. Tôi có thể giúp gì cho bạn hôm nay?', isBot: true },
  ]);

  const handleSend = () => {
    if (!inputText.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), text: inputText.trim(), isBot: false };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');

    setTimeout(() => {
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: 'Mực nước sông hiện tại đang ổn định, nhưng dự kiến sẽ có mưa lớn vào tối nay.',
        isBot: true,
        sources: ['Trung tâm Dự báo Khí tượng Thủy văn Quốc gia', 'Trạm Nước Địa phương Alpha'],
      };
      setMessages((prev) => [...prev, botMsg]);
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1000);

    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 50);
  };

  const renderMessage = (item: Message, index: number) => {
    const isBot = item.isBot;
    const prevSameSender = index > 0 && messages[index - 1].isBot === isBot;
    const nextSameSender = index < messages.length - 1 && messages[index + 1].isBot === isBot;

    const radiusTop = prevSameSender ? 6 : 18;
    const radiusBottom = nextSameSender ? 6 : 18;

    const bubbleStyle = isBot
      ? {
          backgroundColor: isDarkMode ? themeColors.card : '#F0F0F0',
          borderTopLeftRadius: radiusTop,
          borderBottomLeftRadius: radiusBottom,
          borderTopRightRadius: 18,
          borderBottomRightRadius: 18,
        }
      : {
          backgroundColor: themeColors.primary,
          borderTopLeftRadius: 18,
          borderBottomLeftRadius: 18,
          borderTopRightRadius: radiusTop,
          borderBottomRightRadius: radiusBottom,
        };

    return (
      <View
        key={item.id}
        style={[styles.row, isBot ? styles.rowBot : styles.rowUser, prevSameSender && { marginTop: 2 }]}
      >
        <View style={[styles.bubble, bubbleStyle]}>
          <Text style={[Typography.body1, { color: isBot ? themeColors.text : '#FFF', lineHeight: 22 }]}>
            {item.text}
          </Text>
          {isBot && item.sources && (
            <View style={[styles.sources, { borderTopColor: isDarkMode ? themeColors.border : '#D8D8D8' }]}>
              <Text style={[Typography.caption, { color: themeColors.textSecondary, fontWeight: '600' }]}>
                Nguồn:
              </Text>
              {item.sources.map((s, i) => (
                <Text key={i} style={[Typography.caption, { color: themeColors.primary, marginTop: 2 }]}>
                  · {s}
                </Text>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: themeColors.background }]}>
      <KeyboardAvoidingView
        style={GlobalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
          <View>
            <Text style={[Typography.h3, { color: themeColors.text }]}>Trợ lý VNFlood</Text>
            <Text style={[Typography.caption, { color: themeColors.success }]}>Đang hoạt động</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          {messages.map((item, index) => renderMessage(item, index))}
        </ScrollView>

        <View style={[styles.inputRow, { borderTopColor: themeColors.border, backgroundColor: themeColors.background }]}>
          <TextInput
            style={[
              styles.textInput,
              {
                backgroundColor: isDarkMode ? themeColors.card : '#F0F0F0',
                color: themeColors.text,
              },
            ]}
            placeholder="Nhập câu hỏi..."
            placeholderTextColor={themeColors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSend}
            returnKeyType="send"
            multiline
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: inputText.trim() ? themeColors.primary : themeColors.border }]}
            onPress={handleSend}
            disabled={!inputText.trim()}
          >
            <Text style={styles.sendIcon}>↑</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    borderBottomWidth: 1,
  },
  messageList: {
    padding: Spacing.m,
    paddingBottom: Spacing.l,
  },
  row: {
    flexDirection: 'row',
    marginTop: Spacing.s,
    alignItems: 'flex-end',
  },
  rowBot: {
    justifyContent: 'flex-start',
  },
  rowUser: {
    justifyContent: 'flex-end',
  },
  bubble: {
    maxWidth: '75%',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s + 2,
  },
  sources: {
    marginTop: Spacing.s,
    paddingTop: Spacing.s,
    borderTopWidth: 1,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.m,
    paddingTop: Spacing.s,
    paddingBottom: Spacing.l,
    borderTopWidth: 1,
    gap: Spacing.s,
  },
  textInput: {
    flex: 1,
    borderRadius: 22,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s + 2,
    fontSize: 15,
    maxHeight: 120,
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 20,
  },
});
