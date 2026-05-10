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
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionCard: {
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: Spacing.m,
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
  mapHelpButtonContainer: {
    position: 'absolute',
    bottom: Spacing.xl,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.l,
  },

  // Search bar row
  mapSearchRow: {
    position: 'absolute',
    top: 52,
    left: Spacing.m,
    right: Spacing.m,
    flexDirection: 'row',
    gap: Spacing.s,
  },
  mapSearchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.m,
    height: 48,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
    gap: Spacing.s,
  },
  mapSearchIcon: {
    fontSize: 18,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  mapClearBtn: {
    fontSize: 14,
    padding: 2,
  },
  mapMenuBtn: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 5,
  },
  mapMenuIcon: {
    fontSize: 22,
    lineHeight: 26,
  },

  // Search suggestions
  mapSuggestions: {
    position: 'absolute',
    top: 108,
    left: Spacing.m,
    right: Spacing.m + 48 + Spacing.s,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
  },
  mapSuggestionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.m,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.m,
    borderBottomWidth: 1,
  },
  mapSuggestionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    flexShrink: 0,
  },

  // Basin detail panel
  mapPanel: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    flexDirection: 'row',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 10,
  },
  mapPanelAccent: {
    width: 4,
  },
  mapPanelContent: {
    flex: 1,
    padding: Spacing.m,
  },
  mapPanelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  mapCloseBtn: {
    padding: Spacing.xs,
  },
  mapDivider: {
    height: 1,
    marginVertical: Spacing.m,
  },
  mapForecastDay: {
    alignItems: 'center',
    marginRight: Spacing.m,
    gap: 4,
  },
  mapForecastBar: {
    width: 4,
    height: 20,
  },

  // Settings sheet
  mapBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  mapSettingsSheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingBottom: Spacing.xl,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  mapSheetHandle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    alignSelf: 'center',
    marginTop: Spacing.s,
    marginBottom: Spacing.s,
  },
  mapSheetHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
  },
  mapSheetSectionLabel: {
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.s,
  },
  mapSheetDivider: {
    height: 1,
    marginHorizontal: Spacing.l,
    marginVertical: Spacing.m,
  },
  mapRiskRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.s,
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.s,
  },
  mapRiskChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.s,
    paddingHorizontal: Spacing.m,
    paddingVertical: Spacing.s,
  },
  mapRiskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mapLayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.l,
    paddingVertical: Spacing.m,
    borderBottomWidth: 1,
    gap: Spacing.m,
  },
  mapLayerIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  mapLegendRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.l,
    paddingBottom: Spacing.s,
    gap: Spacing.l,
  },
  mapLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  mapLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
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
