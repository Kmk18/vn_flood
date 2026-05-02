import { StyleSheet } from 'react-native';
import { Spacing } from './index';

export const GlobalStyles = StyleSheet.create({
  // -------------------------
  // Layouts & Containers
  // -------------------------
  container: {
    flex: 1,
  },
  centeredContent: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: Spacing.l,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.xl,
  },
  screenPadding: {
    paddingHorizontal: Spacing.m,
  },

  // -------------------------
  // Headers
  // -------------------------
  headerContainer: {
    paddingHorizontal: Spacing.l,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.m,
  },
  headerTitleCenter: {
    textAlign: 'center',
  },

  // -------------------------
  // Core Components
  // -------------------------
  button: {
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    marginVertical: Spacing.s,
  },
  buttonText: {
    textAlign: 'center',
  },
  inputContainer: {
    marginVertical: Spacing.s,
  },
  inputField: {
    height: 48,
    borderBottomWidth: 1.5,
    paddingHorizontal: 0,
    paddingVertical: Spacing.s,
  },
  card: {
    padding: Spacing.m,
    marginVertical: Spacing.s,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },

  // -------------------------
  // Lists
  // -------------------------
  listContainer: {
    paddingBottom: Spacing.xl,
  },
  listItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },

  // -------------------------
  // Map Screen
  // -------------------------
  mapAbsolute: {
    ...StyleSheet.absoluteFillObject,
  },
  mapLayerControls: {
    position: 'absolute',
    top: Spacing.xl * 2,
    right: Spacing.m,
  },
  mapControlButton: {
    paddingHorizontal: Spacing.s,
    height: 40,
  },
  mapHelpButtonContainer: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.l,
  },
  mapHelpButton: {
    height: 56,
    elevation: 5,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
  },

  // -------------------------
  // Chatbot Screen
  // -------------------------
  chatMessageBubble: {
    maxWidth: '85%',
    padding: Spacing.m,
    marginBottom: Spacing.m,
  },
  chatBotBubble: {
    alignSelf: 'flex-start',
  },
  chatUserBubble: {
    alignSelf: 'flex-end',
  },
  chatSourcesContainer: {
    marginTop: Spacing.s,
    paddingTop: Spacing.s,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  chatInputContainer: {
    flexDirection: 'row',
    padding: Spacing.s,
    paddingBottom: Spacing.l,
    borderTopWidth: 1,
    alignItems: 'center',
  },
  chatInputWrapper: {
    flex: 1,
    marginRight: Spacing.s,
  },
  chatSendButton: {
    height: 50,
    marginTop: Spacing.m,
  },

  // -------------------------
  // Profile Screen
  // -------------------------
  profileSection: {
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
  },
  profileSettingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  profileLogoutContainer: {
    marginTop: 'auto',
    padding: Spacing.l,
    paddingBottom: Spacing.xl * 2,
  },
});
