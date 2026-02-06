import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Button, Input, CheckboxGroup, Alert, RegionAutocomplete } from '../ui';
import type { AidCategory, CreateGroupInput } from '../../api/types';

interface GroupFormProps {
  mode: 'create' | 'edit';
  initialValues?: Partial<CreateGroupInput>;
  onSubmit: (data: CreateGroupInput) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
}

interface FormErrors {
  name?: string;
  serviceArea?: string;
  aidCategories?: string;
  contactEmail?: string;
  form?: string;
}

export function GroupForm({
  mode,
  initialValues = {},
  onSubmit,
  onCancel,
  submitLabel,
}: GroupFormProps) {
  const { t } = useTranslation(['groups', 'common']);

  const aidCategoryOptions = [
    { value: 'rent', label: t('groups:form.aidCategoryRent') },
    { value: 'food', label: t('groups:form.aidCategoryFood') },
    { value: 'utilities', label: t('groups:form.aidCategoryUtilities') },
    { value: 'other', label: t('groups:form.aidCategoryOther') },
  ];

  const [name, setName] = useState(initialValues.name || '');
  const [serviceArea, setServiceArea] = useState(initialValues.serviceArea || '');
  const [aidCategories, setAidCategories] = useState<AidCategory[]>(
    initialValues.aidCategories || []
  );
  const [contactEmail, setContactEmail] = useState(initialValues.contactEmail || '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = t('groups:form.nameRequired');
    } else if (name.length > 255) {
      newErrors.name = t('groups:form.nameTooLong');
    }

    if (!serviceArea.trim()) {
      newErrors.serviceArea = t('groups:form.serviceAreaRequired');
    } else if (serviceArea.length > 255) {
      newErrors.serviceArea = t('groups:form.serviceAreaTooLong');
    }

    if (aidCategories.length === 0) {
      newErrors.aidCategories = t('groups:form.aidCategoriesRequired');
    }

    if (!contactEmail.trim()) {
      newErrors.contactEmail = t('groups:form.contactEmailRequired');
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contactEmail)) {
      newErrors.contactEmail = t('groups:form.contactEmailInvalid');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);
    setErrors({});

    try {
      const data: CreateGroupInput = {
        name: name.trim(),
        serviceArea: serviceArea.trim(),
        aidCategories,
        contactEmail: contactEmail.trim().toLowerCase(),
      };

      await onSubmit(data);
    } catch (error) {
      setErrors({
        form: error instanceof Error ? error.message : t('common:somethingWentWrong'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const defaultSubmitLabel =
    mode === 'create' ? t('groups:registerGroup') : t('groups:saveChanges');

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {errors.form && <Alert type="error">{errors.form}</Alert>}

      <Input
        label={t('groups:form.name')}
        name="name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        error={errors.name}
        placeholder={t('groups:form.namePlaceholder')}
        helperText={t('groups:form.nameHelper')}
        autoComplete="organization"
      />

      <RegionAutocomplete
        label={t('groups:form.serviceArea')}
        value={serviceArea}
        onChange={setServiceArea}
        error={errors.serviceArea}
        placeholder={t('groups:form.serviceAreaPlaceholder')}
        helperText={t('groups:form.serviceAreaHelper')}
      />

      <CheckboxGroup
        label={t('groups:form.aidCategories')}
        name="aidCategories"
        options={aidCategoryOptions}
        value={aidCategories}
        onChange={(values) => setAidCategories(values as AidCategory[])}
        error={errors.aidCategories}
      />

      <Input
        label={t('groups:form.contactEmail')}
        name="contactEmail"
        type="email"
        value={contactEmail}
        onChange={(e) => setContactEmail(e.target.value)}
        error={errors.contactEmail}
        placeholder={t('groups:form.contactEmailPlaceholder')}
        helperText={t('groups:form.contactEmailHelper')}
        autoComplete="email"
      />

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button type="submit" isLoading={isSubmitting} className="flex-1">
          {submitLabel || defaultSubmitLabel}
        </Button>
        {onCancel && (
          <Button type="button" variant="secondary" onClick={onCancel} className="flex-1">
            {t('common:cancel')}
          </Button>
        )}
      </div>
    </form>
  );
}
