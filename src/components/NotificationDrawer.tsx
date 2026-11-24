import React from 'react';
import { Bell, CheckCheck, X } from 'lucide-react';
import { TranslationBundle } from '../i18n/translations';
import {
  markAllNotificationsRead,
  markNotificationRead,
} from '../services/firestoreService';
import { AppNotification, Language } from '../types';

interface NotificationDrawerProps {
  open: boolean;
  onClose: () => void;
  t: TranslationBundle;
  language: Language;
  notifications: AppNotification[];
  onEnablePush: () => Promise<void>;
  pushPermission: NotificationPermission;
}

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  open,
  onClose,
  t,
  language,
  notifications,
  onEnablePush,
  pushPermission,
}) => {
  if (!open) return null;

  const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/35 backdrop-blur-[1px]">
      <div className="w-full max-w-md bg-white h-full border-l border-[#E5E1D8] flex flex-col shadow-xl">
        <div className="px-5 py-4 border-b border-[#E5E1D8] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-[#C83E2B]" />
            <h2 className="font-display text-lg font-semibold text-[#18181B]">
              {t.notifications.title}
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {unreadIds.length > 0 && (
              <button
                type="button"
                onClick={() => void markAllNotificationsRead(unreadIds)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#57534E] hover:text-[#18181B] cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>{t.notifications.markAllRead}</span>
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              aria-label={t.common.close}
              className="p-2 rounded-lg text-[#57534E] hover:text-[#18181B] hover:bg-[#F3F1EC] cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {pushPermission === 'default' && (
          <div className="px-5 py-3 bg-[#FAF9F6] border-b border-[#E5E1D8] flex items-center justify-between gap-3">
            <span className="text-xs text-[#57534E]">{t.notifications.enableAlertsCta}</span>
            <button
              type="button"
              onClick={() => void onEnablePush()}
              className="px-3 py-1.5 bg-[#18181B] text-white text-xs font-medium rounded-md hover:bg-[#C83E2B] cursor-pointer whitespace-nowrap"
            >
              {t.profile.enableBrowserPush}
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto divide-y divide-[#E5E1D8]">
          {notifications.length === 0 ? (
            <div className="p-10 text-center text-sm text-[#57534E]">
              {t.notifications.empty}
            </div>
          ) : (
            notifications.map((notif) => {
              const title =
                language === 'hi'
                  ? notif.titleHi
                  : language === 'mr'
                  ? notif.titleMr
                  : notif.title;
              const body =
                language === 'hi'
                  ? notif.bodyHi
                  : language === 'mr'
                  ? notif.bodyMr
                  : notif.body;
              return (
                <button
                  key={notif.id}
                  type="button"
                  onClick={() => {
                    if (!notif.read) void markNotificationRead(notif.id);
                  }}
                  className={`w-full text-left px-5 py-4 transition-colors cursor-pointer ${
                    notif.read ? 'bg-white' : 'bg-[#FAF9F6]'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <p
                      className={`text-sm ${
                        notif.read
                          ? 'font-medium text-[#18181B]'
                          : 'font-semibold text-[#C83E2B]'
                      }`}
                    >
                      {title}
                    </p>
                  </div>
                  <p className="mt-1 text-xs text-[#57534E] leading-relaxed">{body}</p>
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
