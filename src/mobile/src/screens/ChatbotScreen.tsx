import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, KeyboardAvoidingView, Platform,
  ScrollView, StyleSheet, TextInput, TouchableOpacity, ActivityIndicator,
  TextStyle,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as SecureStore from 'expo-secure-store';
import { Spacing, Typography } from '../theme';
import { GlobalStyles } from '../theme/globalStyles';
import { useTheme } from '../theme/useTheme';
import { chatApi } from '../api/chat';
import { useAuthStore } from '../store/useAuthStore';

export const CHAT_HISTORY_KEY = 'chat_history';

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  sources?: string[];
}

// ── Markdown helpers ──────────────────────────────────────────────────────────

const parseInline = (text: string, base: TextStyle): React.ReactNode[] => {
  const nodes: React.ReactNode[] = [];
  const re = /\*\*([^*]+)\*\*|\*([^*]+)\*/g;
  let cursor = 0;
  let k = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    if (m.index > cursor)
      nodes.push(<Text key={k++} style={base}>{text.slice(cursor, m.index)}</Text>);
    nodes.push(
      m[1] !== undefined
        ? <Text key={k++} style={[base, { fontWeight: '700' }]}>{m[1]}</Text>
        : <Text key={k++} style={[base, { fontStyle: 'italic' }]}>{m[2]}</Text>,
    );
    cursor = m.index + m[0].length;
  }
  if (cursor < text.length)
    nodes.push(<Text key={k++} style={base}>{text.slice(cursor)}</Text>);
  return nodes;
};

const MarkdownBody = ({ text, textColor }: { text: string; textColor: string }) => {
  const base: TextStyle = { fontSize: 15, lineHeight: 22, color: textColor };
  const nodes: React.ReactNode[] = [];

  text.split('\n').forEach((line, i) => {
    const t = line.trim();
    if (!t) {
      nodes.push(<View key={i} style={{ height: 6 }} />);
      return;
    }

    const hMatch = t.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      const sz = hMatch[1].length === 1 ? 17 : hMatch[1].length === 2 ? 16 : 15;
      nodes.push(
        <Text key={i} style={{ fontSize: sz, fontWeight: '700', color: textColor, lineHeight: sz * 1.45, marginTop: 6, marginBottom: 2 }}>
          {hMatch[2]}
        </Text>,
      );
      return;
    }

    const bMatch = t.match(/^[*\-]\s+(.+)/);
    if (bMatch) {
      nodes.push(
        <View key={i} style={{ flexDirection: 'row', marginBottom: 3 }}>
          <Text style={[base, { marginRight: 6 }]}>•</Text>
          <Text style={[base, { flex: 1 }]}>{parseInline(bMatch[1], base)}</Text>
        </View>,
      );
      return;
    }

    nodes.push(
      <Text key={i} style={[base, { marginBottom: 2 }]}>{parseInline(t, base)}</Text>,
    );
  });

  return <View>{nodes}</View>;
};

// ─────────────────────────────────────────────────────────────────────────────

const SUGGESTED = [
  'Khu vực nào đang có nguy cơ lũ cao?',
  'Tôi cần chuẩn bị gì trước lũ?',
  'Phải làm gì khi mức rủi ro nguy hiểm?',
  'Số điện thoại khẩn cấp là gì?',
];

const GREETING: Message = { id: '0', text: 'Xin chào! Tôi là trợ lý VNFlood. Tôi có thể giúp gì cho bạn hôm nay?', isBot: true };

export const ChatbotScreen = () => {
  const { isDarkMode, colors } = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const userId = useAuthStore((s) => s.user?.id ?? null);
  const prevUserIdRef = useRef<number | null>(null);

  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const hasSentMessage = messages.length > 1;

  // Clear in-memory history on logout or account switch.
  // Only triggers when we HAD a user (prevId !== null) and the user changed.
  useEffect(() => {
    const prevId = prevUserIdRef.current;
    prevUserIdRef.current = userId;
    if (prevId !== null && prevId !== userId) {
      setMessages([GREETING]);
    }
  }, [userId]);

  useEffect(() => {
    SecureStore.getItemAsync(CHAT_HISTORY_KEY)
      .then((raw) => { if (raw) setMessages(JSON.parse(raw)); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (messages.length <= 1) return;
    const toStore = messages.slice(-6);
    SecureStore.setItemAsync(CHAT_HISTORY_KEY, JSON.stringify(toStore)).catch(() => {});
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMsg: Message = { id: Date.now().toString(), text: text.trim(), isBot: false };
    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      const { reply, sources } = await chatApi.send(text.trim());
      const botMsg: Message = {
        id: (Date.now() + 1).toString(),
        text: reply,
        isBot: true,
        sources: sources.length ? sources : undefined,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), text: 'Xin lỗi, không thể kết nối. Vui lòng thử lại.', isBot: true },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = (item: Message, index: number) => {
    const isBot = item.isBot;
    const prevSame = index > 0 && messages[index - 1].isBot === isBot;
    const nextSame = index < messages.length - 1 && messages[index + 1].isBot === isBot;

    const bubbleStyle = isBot
      ? {
          backgroundColor: isDarkMode ? colors.card : '#F0F0F0',
          borderTopLeftRadius: prevSame ? 6 : 18,
          borderBottomLeftRadius: nextSame ? 6 : 18,
          borderTopRightRadius: 18,
          borderBottomRightRadius: 18,
        }
      : {
          backgroundColor: colors.primary,
          borderTopLeftRadius: 18,
          borderBottomLeftRadius: 18,
          borderTopRightRadius: prevSame ? 6 : 18,
          borderBottomRightRadius: nextSame ? 6 : 18,
        };

    return (
      <View
        key={item.id}
        style={[styles.row, isBot ? styles.rowBot : styles.rowUser, prevSame && { marginTop: 2 }]}
      >
        <View style={[styles.bubble, bubbleStyle]}>
          {isBot
            ? <MarkdownBody text={item.text} textColor={colors.text} />
            : <Text style={[Typography.body1, { color: '#FFF', lineHeight: 22 }]}>{item.text}</Text>
          }
          {isBot && item.sources && (
            <View style={[styles.sources, { borderTopColor: isDarkMode ? colors.border : '#D8D8D8' }]}>
              <Text style={[Typography.caption, { color: colors.textSecondary, fontWeight: '600' }]}>
                Nguồn:
              </Text>
              {item.sources.map((s, i) => (
                <Text key={i} style={[Typography.caption, { color: colors.primary, marginTop: 2 }]}>
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
    <SafeAreaView style={[GlobalStyles.container, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView
        style={GlobalStyles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[Typography.h1, { color: colors.text }]}>Trợ lý</Text>
          <View style={styles.statusBadge}>
            <View style={[styles.statusDot, { backgroundColor: colors.success }]} />
            <Text style={[Typography.caption, { color: colors.success }]}>Đang hoạt động</Text>
          </View>
        </View>

        <ScrollView
          ref={scrollRef}
          contentContainerStyle={styles.messageList}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
        >
          {messages.map((item, index) => renderMessage(item, index))}

          {isLoading && (
            <View style={[styles.row, styles.rowBot]}>
              <View style={[styles.bubble, { backgroundColor: isDarkMode ? colors.card : '#F0F0F0', borderRadius: 18 }]}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            </View>
          )}

          {!hasSentMessage && (
            <View style={styles.suggestions}>
              {SUGGESTED.map((q) => (
                <TouchableOpacity
                  key={q}
                  style={[styles.chip, { backgroundColor: isDarkMode ? colors.card : '#EEF2FF', borderColor: colors.primary }]}
                  onPress={() => sendMessage(q)}
                >
                  <Text style={[Typography.caption, { color: colors.primary }]}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </ScrollView>

        <View style={[styles.inputRow, { borderTopColor: colors.border, backgroundColor: colors.background }]}>
          <TextInput
            style={[
              styles.textInput,
              { backgroundColor: isDarkMode ? colors.card : '#F0F0F0', color: colors.text },
            ]}
            placeholder="Nhập câu hỏi..."
            placeholderTextColor={colors.textSecondary}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={() => sendMessage(inputText)}
            returnKeyType="send"
            multiline
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: inputText.trim() && !isLoading ? colors.primary : colors.border }]}
            onPress={() => sendMessage(inputText)}
            disabled={!inputText.trim() || isLoading}
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
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.m,
    borderBottomWidth: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginTop: 2,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
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
  rowBot:  { justifyContent: 'flex-start' },
  rowUser: { justifyContent: 'flex-end' },
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
  suggestions: {
    marginTop: Spacing.l,
    gap: Spacing.s,
  },
  chip: {
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
    borderRadius: 20,
    borderWidth: 1,
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
