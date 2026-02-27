export const formatPhoneNumber = (phoneNumberString: string) => {
    // Remove all non-numeric characters
    const cleaned = ('' + phoneNumberString).replace(/\D/g, '');

    // Check if the input is of correct length
    const match = cleaned.match(/^(\d{3})(\d{3})(\d{4})$/);

    if (match) {
        return `${match[1]}-${match[2]}-${match[3]}`;
    }

    // Return original string if it doesn't match standard lengths
    return phoneNumberString;
};
