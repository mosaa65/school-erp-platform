type ContactPickerContact = {
  name?: string[];
  tel?: string[];
};

type ContactsManager = {
  select: (
    properties: Array<"name" | "tel">,
    options?: { multiple?: boolean },
  ) => Promise<ContactPickerContact[]>;
};

export type PickedPhoneContact = {
  contactName: string;
  phoneNumbers: string[];
};

function getContactsManager(): ContactsManager | null {
  if (typeof window === "undefined") {
    return null;
  }

  const navigatorWithContacts = window.navigator as Navigator & {
    contacts?: ContactsManager;
  };

  if (!window.isSecureContext) {
    return null;
  }

  if (
    !navigatorWithContacts.contacts ||
    typeof navigatorWithContacts.contacts.select !== "function"
  ) {
    return null;
  }

  return navigatorWithContacts.contacts;
}

export function supportsContactPicker(): boolean {
  return getContactsManager() !== null;
}

function normalizePhoneNumbers(values: string[] | undefined): string[] {
  if (!Array.isArray(values)) {
    return [];
  }

  const unique = new Set<string>();

  values.forEach((value) => {
    const normalized = value.trim();
    if (normalized) {
      unique.add(normalized);
    }
  });

  return Array.from(unique);
}

function formatContactName(values: string[] | undefined): string {
  if (!Array.isArray(values)) {
    return "جهة اتصال";
  }

  const candidate = values.find((value) => value.trim().length > 0);
  return candidate?.trim() ?? "جهة اتصال";
}

export async function pickSinglePhoneContact(): Promise<PickedPhoneContact | null> {
  const contactsManager = getContactsManager();
  if (!contactsManager) {
    return null;
  }

  const contacts = await contactsManager.select(["name", "tel"], { multiple: false });
  const selectedContact = contacts[0];
  if (!selectedContact) {
    return null;
  }

  const phoneNumbers = normalizePhoneNumbers(selectedContact.tel);
  if (phoneNumbers.length === 0) {
    return null;
  }

  return {
    contactName: formatContactName(selectedContact.name),
    phoneNumbers,
  };
}
